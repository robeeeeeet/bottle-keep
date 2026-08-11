"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// 型定義
export type ShelfShare = {
  id: string;
  owner_id: string;
  shared_with_id: string | null;
  invite_code: string | null;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  accepted_at: string | null;
  owner?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  shared_with?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

export type Friend = {
  id: string;
  shareId: string;
  display_name: string | null;
  avatar_url: string | null;
  since: string;
};

// Supabaseサーバークライアントの型（ヘルパー関数に渡すため）
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const INVITE_CODE_CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
const INVITE_CODE_LENGTH = 8;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * PostgRESTのフィルタ文字列（.or()等）へ値を埋め込む前の形式チェック。
 * JWT由来のIDは本来UUIDだが、手組みのフィルタ文字列に入れる値は必ずここを通す。
 */
function isUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
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

/**
 * 招待レコードを新規作成（コード重複時はリトライ）
 * getOrCreateInvite / regenerateInvite の共通処理
 */
async function createInviteWithRetry(
  supabase: SupabaseServerClient,
  ownerId: string
): Promise<{ code: string } | { error: string }> {
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data, error } = await supabase
      .from("shelf_shares")
      .insert({
        owner_id: ownerId,
        shared_with_id: null,
        invite_code: generateInviteCode(),
        status: "pending",
      })
      .select("invite_code")
      .single();

    if (!error && data?.invite_code) {
      revalidatePath("/shared");
      return { code: data.invite_code };
    }

    // ユニーク制約エラーの場合は別コードでリトライ
    if (error?.code === "23505") {
      continue;
    }

    console.error("Failed to create invite:", error);
    return { error: "招待コードの生成に失敗しました" };
  }

  return { error: "招待コードの生成に失敗しました。再度お試しください。" };
}

/**
 * 招待コードを取得（既存があれば返す、なければ新規作成）
 */
export async function getOrCreateInvite(): Promise<{ code: string } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証が必要です" };
  }

  // 既存の有効な招待があれば返す
  const { data: existing } = await supabase
    .from("shelf_shares")
    .select("invite_code")
    .eq("owner_id", user.id)
    .eq("status", "pending")
    .is("shared_with_id", null)
    .not("invite_code", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existing?.invite_code) {
    return { code: existing.invite_code };
  }

  // なければ新規作成
  return createInviteWithRetry(supabase, user.id);
}

/**
 * 招待コードを再生成（既存を削除して新規作成）
 */
export async function regenerateInvite(): Promise<{ code: string } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証が必要です" };
  }

  // 既存の未使用招待を削除
  await supabase
    .from("shelf_shares")
    .delete()
    .eq("owner_id", user.id)
    .eq("status", "pending")
    .is("shared_with_id", null);

  // 新規作成
  return createInviteWithRetry(supabase, user.id);
}

/**
 * 自分の招待・フレンド一覧を取得
 */
export async function getSharesAndFriends(): Promise<{
  currentInvite: ShelfShare | null;
  friends: Friend[];
}> {
  const supabase = await createClient();

  // JWTからローカル取得（Authサーバーへの往復なし）
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  // 後段の .or() でフィルタ文字列に埋め込むため、UUID形式を検証してから使う
  if (!isUuid(userId)) {
    return { currentInvite: null, friends: [] };
  }

  // 招待コードと承認済み共有関係を並列取得
  const [inviteResult, sharesResult] = await Promise.all([
    // 自分の招待コード（最新1件のみ）
    supabase
      .from("shelf_shares")
      .select("*")
      .eq("owner_id", userId)
      .eq("status", "pending")
      .is("shared_with_id", null)
      .not("invite_code", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
    // 承認済みの共有関係（自分がオーナー or 相手がオーナー）
    supabase
      .from("shelf_shares")
      .select(`
        *,
        owner:profiles!shelf_shares_owner_profiles_fkey (id, display_name, avatar_url),
        shared_with:profiles!shelf_shares_shared_with_profiles_fkey (id, display_name, avatar_url)
      `)
      .eq("status", "accepted")
      .or(`owner_id.eq.${userId},shared_with_id.eq.${userId}`)
      .order("accepted_at", { ascending: false }),
  ]);

  const currentInviteData = inviteResult.data;
  const acceptedShares = sharesResult.data;

  // フレンドリストを構築
  const friends: Friend[] = (acceptedShares || []).map((share) => {
    const iAmOwner = share.owner_id === userId;
    const friendProfile = iAmOwner ? share.shared_with : share.owner;
    return {
      id: friendProfile?.id || "",
      shareId: share.id,
      display_name: friendProfile?.display_name || null,
      avatar_url: friendProfile?.avatar_url || null,
      since: share.accepted_at || share.created_at,
    };
  });

  return {
    currentInvite: (currentInviteData as ShelfShare) || null,
    friends,
  };
}

/**
 * 招待を削除（オーナーのみ）
 */
export async function deleteInvite(shareId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証が必要です" };
  }

  const { error } = await supabase
    .from("shelf_shares")
    .delete()
    .eq("id", shareId)
    .eq("owner_id", user.id);

  if (error) {
    console.error("Failed to delete invite:", error);
    return { error: "招待の削除に失敗しました" };
  }

  revalidatePath("/shared");
  return {};
}

/**
 * フレンドを解除
 */
export async function removeFriend(shareId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証が必要です" };
  }

  // 後段の .or() でフィルタ文字列に埋め込むため、UUID形式を検証してから使う
  if (!isUuid(user.id)) {
    return { error: "認証情報が不正です" };
  }

  // 自分がオーナーか、共有された側の場合のみ削除可能
  const { error } = await supabase
    .from("shelf_shares")
    .delete()
    .eq("id", shareId)
    .eq("status", "accepted")
    .or(`owner_id.eq.${user.id},shared_with_id.eq.${user.id}`);

  if (error) {
    console.error("Failed to remove friend:", error);
    return { error: "フレンドの解除に失敗しました" };
  }

  revalidatePath("/shared");
  revalidatePath("/shelf");
  return {};
}

/**
 * 自分のコレクションを全削除（joinByCode からのみ呼ばれる内部関数）
 * - collection_entriesを全削除
 * - 他ユーザーから参照されていないalcoholsを削除（孤立データのクリーンアップ）
 *
 * 【既知のリスク】孤立alcoholsの「参照チェック → 削除」はアトミックではない。
 * チェックと削除の間に他ユーザーが同じalcoholを登録すると、その参照が
 * 巻き込まれて消える可能性がある。DB側のRPC/トランザクションを追加できない
 * 前提のため完全には解消できず、削除直前に再チェックしてレースの
 * ウィンドウを最小化するに留めている。
 *
 * 破壊的操作のため export しない（UIの確認ダイアログを迂回した単独呼び出しを防ぐ）。
 */
async function deleteMyCollection(): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証が必要です" };
  }

  // 1. 自分のcollection_entriesで使用しているalcohol_idを取得
  const { data: myEntries } = await supabase
    .from("collection_entries")
    .select("alcohol_id")
    .eq("user_id", user.id);

  const myAlcoholIds = Array.from(
    new Set(myEntries?.map((e) => e.alcohol_id) || [])
  );

  // 2. 自分のcollection_entriesを全削除
  const { error: deleteEntriesError } = await supabase
    .from("collection_entries")
    .delete()
    .eq("user_id", user.id);

  if (deleteEntriesError) {
    console.error("Failed to delete entries:", deleteEntriesError);
    return { error: "コレクションの削除に失敗しました" };
  }

  // 3. 他ユーザーから参照されていないalcoholsを削除
  if (myAlcoholIds.length > 0) {
    // 他ユーザーが使用しているalcohol_idを取得
    const { data: othersEntries } = await supabase
      .from("collection_entries")
      .select("alcohol_id")
      .neq("user_id", user.id)
      .in("alcohol_id", myAlcoholIds);

    const usedByOthers = new Set(othersEntries?.map((e) => e.alcohol_id) || []);

    // 誰も使っていないalcoholsの候補
    const orphanCandidates = myAlcoholIds.filter((id) => !usedByOthers.has(id));

    if (orphanCandidates.length > 0) {
      // 削除直前にもう一度参照チェックし、その間に登録された参照を除外する
      // （レースを完全には防げないがウィンドウを最小化する）
      const { data: recheckEntries, error: recheckError } = await supabase
        .from("collection_entries")
        .select("alcohol_id")
        .neq("user_id", user.id)
        .in("alcohol_id", orphanCandidates);

      if (recheckError) {
        // 参照状況が確認できない場合は削除しない（他人のデータを消すより残す方が安全）
        console.warn("Skipped orphan cleanup, recheck failed:", recheckError);
        revalidatePath("/shelf");
        return {};
      }

      const stillUsedByOthers = new Set(
        recheckEntries?.map((e) => e.alcohol_id) || []
      );
      const orphanedIds = orphanCandidates.filter(
        (id) => !stillUsedByOthers.has(id)
      );

      if (orphanedIds.length > 0) {
        const { error: deleteAlcoholsError } = await supabase
          .from("alcohols")
          .delete()
          .in("id", orphanedIds);

        if (deleteAlcoholsError) {
          // 孤立データの削除失敗は致命的ではないのでログのみ
          console.warn("Failed to delete orphaned alcohols:", deleteAlcoholsError);
        }
      }
    }
  }

  revalidatePath("/shelf");
  return {};
}

/**
 * 招待コードを受諾可能か検証する（非破壊）
 * joinByCode と validateInviteCode の共通処理
 */
async function resolveJoinableInvite(
  supabase: SupabaseServerClient,
  userId: string,
  code: string
): Promise<{ invite: { id: string; owner_id: string } } | { error: string }> {
  // 招待情報を取得して検証
  const { data: invite, error: fetchError } = await supabase
    .from("shelf_shares")
    .select("id, owner_id, status, shared_with_id")
    .eq("invite_code", code)
    .single();

  if (fetchError || !invite) {
    return { error: "招待コードが見つかりません" };
  }

  // 自分自身への招待は受け入れられない
  if (invite.owner_id === userId) {
    return { error: "自分自身の招待コードです" };
  }

  // 既に誰かが受け入れている
  if (invite.shared_with_id !== null) {
    return { error: "この招待コードは既に使用されています" };
  }

  // 既に承認済み
  if (invite.status !== "pending") {
    return { error: "この招待コードは既に処理されています" };
  }

  // 後段の .or() でフィルタ文字列に埋め込むため、UUID形式を検証してから使う
  if (!isUuid(invite.owner_id)) {
    return { error: "招待コードが見つかりません" };
  }

  // 既にフレンドかチェック
  const { data: existingShare } = await supabase
    .from("shelf_shares")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(owner_id.eq.${invite.owner_id},shared_with_id.eq.${userId}),and(owner_id.eq.${userId},shared_with_id.eq.${invite.owner_id})`
    )
    .single();

  if (existingShare) {
    return { error: "既にフレンドです" };
  }

  return { invite: { id: invite.id, owner_id: invite.owner_id } };
}

/**
 * 招待コードの妥当性のみを確認する（レコードは一切変更しない）
 * 「コレクションを削除して参加」のような不可逆な確認画面へ進む前に呼ぶ。
 */
export async function validateInviteCode(
  code: string
): Promise<{ valid: true } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証が必要です" };
  }

  if (!isUuid(user.id)) {
    return { error: "認証情報が不正です" };
  }

  const resolved = await resolveJoinableInvite(supabase, user.id, code);
  if ("error" in resolved) {
    return { error: resolved.error };
  }

  return { valid: true };
}

/**
 * 招待コードでフレンドに参加
 */
export async function joinByCode(
  code: string,
  options?: { deleteCollection?: boolean }
): Promise<{ success: boolean } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証が必要です" };
  }

  // 後段の .or() でフィルタ文字列に埋め込むため、UUID形式を検証してから使う
  if (!isUuid(user.id)) {
    return { error: "認証情報が不正です" };
  }

  const resolved = await resolveJoinableInvite(supabase, user.id, code);
  if ("error" in resolved) {
    return { error: resolved.error };
  }
  const invite = resolved.invite;

  // 招待を受け入れて即フレンドになる
  // ここまでの検証と実際のUPDATEの間に他者が受諾している可能性があるため、
  // 条件付きUPDATE + .select() で「実際に更新された行」を確認する。
  // （0行更新でも error は null になるので、行数を見ないと成功と誤判定する）
  const { data: acceptedRows, error: updateError } = await supabase
    .from("shelf_shares")
    .update({
      shared_with_id: user.id,
      status: "accepted",
      accepted_at: new Date().toISOString(),
    })
    .eq("id", invite.id)
    .eq("status", "pending")
    .is("shared_with_id", null)
    .select("id");

  if (updateError) {
    console.error("Failed to join by code:", updateError);
    return { error: "参加に失敗しました" };
  }

  if (!acceptedRows || acceptedRows.length === 0) {
    // 競合で他者に取られた／既に使用済み。コレクションは削除していないので無害。
    return { error: "この招待コードは既に使用されています" };
  }

  // 招待の受諾が確定した後にのみ、オプションのコレクション削除を実行する。
  // （削除を先に行うと、受諾が失敗した場合にコレクションだけが失われる）
  if (options?.deleteCollection) {
    const deleteResult = await deleteMyCollection();
    if (deleteResult.error) {
      // フレンド関係自体は成立しているので、画面を更新した上で削除失敗のみ通知
      revalidatePath("/shared");
      revalidatePath("/shelf");
      return { error: `フレンドになりましたが、${deleteResult.error}` };
    }
  }

  revalidatePath("/shared");
  revalidatePath("/shelf");
  return { success: true };
}
