"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { FollowUser } from "@/types/db";

// Supabaseサーバークライアントの型（ヘルパー関数に渡すため）
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const INVITE_CODE_CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
const INVITE_CODE_LENGTH = 8;

/** 招待コードとして受け付ける形式（生成時の文字集合＋長さの範囲で緩く検証） */
const INVITE_CODE_PATTERN = /^[A-Za-z0-9]{4,32}$/;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** PostgRESTのユニーク制約違反 */
const PG_UNIQUE_VIOLATION = "23505";
/** RLSポリシー違反（insert/updateがポリシーに弾かれた場合） */
const PG_RLS_VIOLATION = "42501";

function isUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

/** ログイン中ユーザーのIDをJWTからローカル取得する（Authサーバーへの往復なし） */
async function getCurrentUserId(
  supabase: SupabaseServerClient
): Promise<string | null> {
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  return isUuid(userId) ? userId : null;
}

// ユニークな招待コードを生成（CSPRNGベースで予測困難にする）
function generateInviteCode(): string {
  const charsLength = INVITE_CODE_CHARS.length;
  // 剰余バイアスを避けるため、範囲外のバイトは破棄する
  const limit = Math.floor(256 / charsLength) * charsLength;
  let code = "";

  while (code.length < INVITE_CODE_LENGTH) {
    const bytes = new Uint8Array(INVITE_CODE_LENGTH);
    globalThis.crypto.getRandomValues(bytes);

    for (let i = 0; i < bytes.length && code.length < INVITE_CODE_LENGTH; i++) {
      const byte = bytes[i];
      if (byte >= limit) continue;
      code += INVITE_CODE_CHARS.charAt(byte % charsLength);
    }
  }

  return code;
}

/** 「有効なリンクは1ユーザー1本」の部分ユニークindexに当たったかを判定する */
function isActiveLinkConflict(message: string | undefined): boolean {
  return (message ?? "").includes("invite_links_one_active_per_user_idx");
}

// ─────────────────────────────────────────────────────────────────
// 招待リンク
// ─────────────────────────────────────────────────────────────────

export type InviteLinkResult = { code: string } | { error: string };

/**
 * 招待リンクを新規作成する。
 *
 * @param reuseExisting 既に有効なリンクがある場合にそれを返すか。
 *   再発行（regenerate）では旧コードを成功として返してはいけないので false にする。
 */
async function insertInviteLink(
  supabase: SupabaseServerClient,
  userId: string,
  reuseExisting: boolean
): Promise<InviteLinkResult> {
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data, error } = await supabase
      .from("invite_links")
      .insert({ user_id: userId, code: generateInviteCode() })
      .select("code")
      .single();

    if (!error && data?.code) {
      return { code: data.code };
    }

    if (error?.code === PG_UNIQUE_VIOLATION) {
      // 「有効なリンクは1ユーザー1本」に当たった場合はコードを変えても解決しない
      if (isActiveLinkConflict(error.message)) {
        if (!reuseExisting) {
          console.error("Active invite link still exists:", error);
          return {
            error:
              "招待リンクの再発行に失敗しました。時間をおいて再度お試しください。",
          };
        }
        const existing = await fetchActiveInviteCode(supabase, userId);
        if (existing) return { code: existing };
        return { error: "招待リンクの作成に失敗しました" };
      }
      // コード重複なら別のコードでリトライ
      continue;
    }

    console.error("Failed to create invite link:", error);
    return { error: "招待リンクの作成に失敗しました" };
  }

  return { error: "招待リンクの作成に失敗しました。再度お試しください。" };
}

/** 自分の有効な招待コードを取得する（無ければnull） */
async function fetchActiveInviteCode(
  supabase: SupabaseServerClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("invite_links")
    .select("code")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch invite link:", error);
    return null;
  }
  return data?.code ?? null;
}

/**
 * 招待リンクを取得（有効なものが無ければ作成）
 */
export async function createInviteLink(): Promise<InviteLinkResult> {
  const supabase = await createClient();
  const userId = await getCurrentUserId(supabase);
  if (!userId) return { error: "認証が必要です" };

  const existing = await fetchActiveInviteCode(supabase, userId);
  if (existing) return { code: existing };

  const result = await insertInviteLink(supabase, userId, true);
  if ("code" in result) revalidatePath("/shared");
  return result;
}

/**
 * 招待リンクを再発行する（旧リンクは即座に無効になる）
 */
export async function regenerateInviteLink(): Promise<InviteLinkResult> {
  const supabase = await createClient();
  const userId = await getCurrentUserId(supabase);
  if (!userId) return { error: "認証が必要です" };

  const revokedAt = new Date().toISOString();

  // 0行更新でも error は null になるため、.select() で実際の更新行を確認する
  const { error: revokeError } = await supabase
    .from("invite_links")
    .update({ revoked_at: revokedAt })
    .eq("user_id", userId)
    .is("revoked_at", null)
    .select("id");

  if (revokeError) {
    console.error("Failed to revoke invite link:", revokeError);
    return { error: "旧リンクの無効化に失敗しました" };
  }

  // 無効化が実際に効いていなければ、下のinsertが部分ユニークindexで弾かれる。
  // その場合に旧コードを返してしまわないよう reuseExisting=false で呼ぶ。
  const result = await insertInviteLink(supabase, userId, false);
  if ("code" in result) revalidatePath("/shared");
  return result;
}

// ─────────────────────────────────────────────────────────────────
// フォロー関係の取得
// ─────────────────────────────────────────────────────────────────

export type FollowData = {
  /** 自分の有効な招待コード（未作成ならnull） */
  inviteCode: string | null;
  /** 自分がフォローしている相手 */
  following: FollowUser[];
  /** 自分をフォローしている相手 */
  followers: FollowUser[];
};

type EmbeddedProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
} | null;

/**
 * 招待リンク・フォロー中・フォロワーを並列取得する
 */
export async function getFollowData(): Promise<FollowData> {
  const supabase = await createClient();
  const userId = await getCurrentUserId(supabase);
  if (!userId) {
    return { inviteCode: null, following: [], followers: [] };
  }

  // profilesの埋め込みは follows の外部キー名（follows_followee_id_fkey /
  // follows_follower_id_fkey）で明示する。profilesのRLSは
  // 「フォロー関係にある相手」を参照許可しているため、埋め込みでも取得できる。
  const [inviteResult, followingResult, followersResult] = await Promise.all([
    supabase
      .from("invite_links")
      .select("code")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("follows")
      .select(
        "followee_id, created_at, profile:profiles!follows_followee_id_fkey (id, display_name, avatar_url)"
      )
      .eq("follower_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("follows")
      .select(
        "follower_id, created_at, profile:profiles!follows_follower_id_fkey (id, display_name, avatar_url)"
      )
      .eq("followee_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  if (inviteResult.error) {
    console.error("Failed to fetch invite link:", inviteResult.error);
  }
  if (followingResult.error) {
    console.error("Failed to fetch following:", followingResult.error);
  }
  if (followersResult.error) {
    console.error("Failed to fetch followers:", followersResult.error);
  }

  const followingRows = followingResult.data ?? [];
  const followerRows = followersResult.data ?? [];

  const followingIds = new Set(followingRows.map((row) => row.followee_id));
  const followerIds = new Set(followerRows.map((row) => row.follower_id));

  const toFollowUser = (
    id: string,
    profile: EmbeddedProfile,
    createdAt: string,
    isMutual: boolean
  ): FollowUser => ({
    id,
    display_name: profile?.display_name ?? null,
    avatar_url: profile?.avatar_url ?? null,
    since: createdAt,
    isMutual,
  });

  return {
    inviteCode: inviteResult.data?.code ?? null,
    following: followingRows.map((row) =>
      toFollowUser(
        row.followee_id,
        row.profile as EmbeddedProfile,
        row.created_at,
        followerIds.has(row.followee_id)
      )
    ),
    followers: followerRows.map((row) =>
      toFollowUser(
        row.follower_id,
        row.profile as EmbeddedProfile,
        row.created_at,
        followingIds.has(row.follower_id)
      )
    ),
  };
}

// ─────────────────────────────────────────────────────────────────
// フォロー操作
// ─────────────────────────────────────────────────────────────────

export type ActionResult = { success: true } | { error: string };

/**
 * フォロー返し（相手が自分をフォローしている場合のみRLSが許可する）
 */
export async function followBack(targetUserId: string): Promise<ActionResult> {
  if (!isUuid(targetUserId)) return { error: "ユーザーIDが不正です" };

  const supabase = await createClient();
  const userId = await getCurrentUserId(supabase);
  if (!userId) return { error: "認証が必要です" };
  if (userId === targetUserId) return { error: "自分自身はフォローできません" };

  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: userId, followee_id: targetUserId });

  if (error) {
    // 既にフォロー済みなら成功扱い（二重クリックなど）
    if (error.code === PG_UNIQUE_VIOLATION) {
      revalidatePath("/shared");
      revalidatePath("/shelf");
      return { success: true };
    }
    if (error.code === PG_RLS_VIOLATION) {
      return {
        error:
          "フォロー返しできませんでした。相手のフォローが解除された可能性があります。",
      };
    }
    console.error("Failed to follow back:", error);
    return { error: "フォローに失敗しました" };
  }

  revalidatePath("/shared");
  revalidatePath("/shelf");
  return { success: true };
}

/**
 * フォローを解除する（自分がフォローしている側の行を削除）
 */
export async function unfollow(targetUserId: string): Promise<ActionResult> {
  if (!isUuid(targetUserId)) return { error: "ユーザーIDが不正です" };

  const supabase = await createClient();
  const userId = await getCurrentUserId(supabase);
  if (!userId) return { error: "認証が必要です" };

  // 0行削除でも error は null になるため、.select() で実際の削除行を確認する
  const { data, error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", userId)
    .eq("followee_id", targetUserId)
    .select("followee_id");

  if (error) {
    console.error("Failed to unfollow:", error);
    return { error: "フォロー解除に失敗しました" };
  }

  revalidatePath("/shared");
  revalidatePath("/shelf");

  if (!data || data.length === 0) {
    return { error: "フォロー関係が見つかりませんでした（既に解除済みです）" };
  }
  return { success: true };
}

/**
 * フォロワーから外す（自分がフォローされている側の行を削除）
 */
export async function removeFollower(
  followerUserId: string
): Promise<ActionResult> {
  if (!isUuid(followerUserId)) return { error: "ユーザーIDが不正です" };

  const supabase = await createClient();
  const userId = await getCurrentUserId(supabase);
  if (!userId) return { error: "認証が必要です" };

  const { data, error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", followerUserId)
    .eq("followee_id", userId)
    .select("follower_id");

  if (error) {
    console.error("Failed to remove follower:", error);
    return { error: "フォロワーの解除に失敗しました" };
  }

  revalidatePath("/shared");
  revalidatePath("/shelf");

  if (!data || data.length === 0) {
    return { error: "フォロワーが見つかりませんでした（既に解除済みです）" };
  }
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────
// 招待リンク経由のフォロー
// ─────────────────────────────────────────────────────────────────

export type InviteStatus =
  | "ok"
  | "already_following"
  | "self"
  | "not_found"
  | "auth_required"
  | "error";

export type InvitePeek = {
  status: InviteStatus;
  followeeId: string | null;
  displayName: string | null;
};

/** RPCが返すjsonbを型付きの形に整える */
function parseInviteRpc(value: unknown): InvitePeek {
  if (typeof value !== "object" || value === null) {
    return { status: "error", followeeId: null, displayName: null };
  }

  const record = value as Record<string, unknown>;
  const rawStatus = record.status;
  const allowed: InviteStatus[] = [
    "ok",
    "already_following",
    "self",
    "not_found",
    "auth_required",
  ];
  const status = allowed.find((s) => s === rawStatus) ?? "error";

  return {
    status,
    followeeId:
      typeof record.followee_id === "string" ? record.followee_id : null,
    displayName:
      typeof record.display_name === "string" ? record.display_name : null,
  };
}

/**
 * 招待コードの内容を確認する（レコードは一切変更しない）
 */
export async function peekInvite(code: string): Promise<InvitePeek> {
  if (!INVITE_CODE_PATTERN.test(code)) {
    return { status: "not_found", followeeId: null, displayName: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("peek_invite", {
    invite_code: code,
  });

  if (error) {
    console.error("Failed to peek invite:", error);
    return { status: "error", followeeId: null, displayName: null };
  }

  return parseInviteRpc(data);
}

export type FollowViaInviteResult =
  | { success: true; displayName: string | null }
  | { error: string };

/**
 * 招待リンク経由でフォローする。
 * RLSでは直接insertできないため、必ず follow_via_invite RPC を使う。
 */
export async function followViaInvite(
  code: string
): Promise<FollowViaInviteResult> {
  if (!INVITE_CODE_PATTERN.test(code)) {
    return { error: "招待リンクが無効です" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("follow_via_invite", {
    invite_code: code,
  });

  if (error) {
    console.error("Failed to follow via invite:", error);
    return { error: "フォローに失敗しました" };
  }

  const result = parseInviteRpc(data);

  switch (result.status) {
    case "ok":
    case "already_following":
      revalidatePath("/shared");
      revalidatePath("/shelf");
      return { success: true, displayName: result.displayName };
    case "self":
      return { error: "自分自身の招待リンクです" };
    case "not_found":
      return {
        error: "招待リンクが無効です（再発行された可能性があります）",
      };
    case "auth_required":
      return { error: "認証が必要です" };
    default:
      return { error: "フォローに失敗しました" };
  }
}
