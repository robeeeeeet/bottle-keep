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

// ユニークな招待コードを生成
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
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
  let inviteCode = generateInviteCode();
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    const { data, error } = await supabase
      .from("shelf_shares")
      .insert({
        owner_id: user.id,
        shared_with_id: null,
        invite_code: inviteCode,
        status: "pending",
      })
      .select("invite_code")
      .single();

    if (!error && data) {
      revalidatePath("/shared");
      return { code: data.invite_code };
    }

    // ユニーク制約エラーの場合はリトライ
    if (error?.code === "23505") {
      inviteCode = generateInviteCode();
      attempts++;
      continue;
    }

    console.error("Failed to create invite:", error);
    return { error: "招待コードの生成に失敗しました" };
  }

  return { error: "招待コードの生成に失敗しました。再度お試しください。" };
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
  let inviteCode = generateInviteCode();
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    const { data, error } = await supabase
      .from("shelf_shares")
      .insert({
        owner_id: user.id,
        shared_with_id: null,
        invite_code: inviteCode,
        status: "pending",
      })
      .select("invite_code")
      .single();

    if (!error && data) {
      revalidatePath("/shared");
      return { code: data.invite_code };
    }

    if (error?.code === "23505") {
      inviteCode = generateInviteCode();
      attempts++;
      continue;
    }

    console.error("Failed to regenerate invite:", error);
    return { error: "招待コードの再生成に失敗しました" };
  }

  return { error: "招待コードの生成に失敗しました。再度お試しください。" };
}

/**
 * 自分の招待・フレンド一覧を取得
 */
export async function getSharesAndFriends(): Promise<{
  currentInvite: ShelfShare | null;
  friends: Friend[];
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { currentInvite: null, friends: [] };
  }

  // 自分の招待コード（最新1件のみ）
  const { data: currentInviteData } = await supabase
    .from("shelf_shares")
    .select("*")
    .eq("owner_id", user.id)
    .eq("status", "pending")
    .is("shared_with_id", null)
    .not("invite_code", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // 承認済みの共有関係（自分がオーナー or 相手がオーナー）
  const { data: acceptedShares } = await supabase
    .from("shelf_shares")
    .select(`
      *,
      owner:profiles!shelf_shares_owner_profiles_fkey (id, display_name, avatar_url),
      shared_with:profiles!shelf_shares_shared_with_profiles_fkey (id, display_name, avatar_url)
    `)
    .eq("status", "accepted")
    .or(`owner_id.eq.${user.id},shared_with_id.eq.${user.id}`)
    .order("accepted_at", { ascending: false });

  // フレンドリストを構築
  const friends: Friend[] = (acceptedShares || []).map((share) => {
    const iAmOwner = share.owner_id === user.id;
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
 * 自分のコレクションを全削除（フレンド参加時に選択可能）
 * - collection_entriesを全削除
 * - 他ユーザーから参照されていないalcoholsを削除（孤立データのクリーンアップ）
 */
export async function deleteMyCollection(): Promise<{ error?: string }> {
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

  const myAlcoholIds = myEntries?.map((e) => e.alcohol_id) || [];

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

    // 誰も使っていないalcoholsを削除
    const orphanedIds = myAlcoholIds.filter((id) => !usedByOthers.has(id));
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

  revalidatePath("/shelf");
  return {};
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
  if (invite.owner_id === user.id) {
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

  // 既にフレンドかチェック
  const { data: existingShare } = await supabase
    .from("shelf_shares")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(owner_id.eq.${invite.owner_id},shared_with_id.eq.${user.id}),and(owner_id.eq.${user.id},shared_with_id.eq.${invite.owner_id})`
    )
    .single();

  if (existingShare) {
    return { error: "既にフレンドです" };
  }

  // オプションで自分のコレクションを削除
  if (options?.deleteCollection) {
    const deleteResult = await deleteMyCollection();
    if (deleteResult.error) {
      return { error: deleteResult.error };
    }
  }

  // 招待を受け入れて即フレンドになる
  const { error: updateError } = await supabase
    .from("shelf_shares")
    .update({
      shared_with_id: user.id,
      status: "accepted",
      accepted_at: new Date().toISOString(),
    })
    .eq("id", invite.id)
    .eq("status", "pending")
    .is("shared_with_id", null);

  if (updateError) {
    console.error("Failed to join by code:", updateError);
    return { error: "参加に失敗しました" };
  }

  revalidatePath("/shared");
  revalidatePath("/shelf");
  return { success: true };
}
