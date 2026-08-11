"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const NOTE_MAX_LENGTH = 500;

/**
 * いいねのトグル。
 *
 * いいねできるのは「他人の投稿」かつ「フォロー中の相手の投稿」だけで、
 * これはRLS（can_like_entry）が強制する。ここでの失敗はユーザー向け文言に変換する。
 * いいね数（collection_entries.like_count）はDBのトリガーが更新する。
 */
export async function toggleLike(
  entryId: string,
  liked: boolean
): Promise<{ error?: string } | undefined> {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) {
    return { error: "ログインが必要です" };
  }

  if (liked) {
    // 二度押し（既にいいね済み）でもエラーにしない
    const { error } = await supabase
      .from("post_likes")
      .upsert({ user_id: userId, entry_id: entryId }, { onConflict: "user_id,entry_id" });

    if (error) {
      console.error("Failed to like entry:", error);
      return { error: "いいねできませんでした" };
    }
  } else {
    const { error } = await supabase
      .from("post_likes")
      .delete()
      .eq("user_id", userId)
      .eq("entry_id", entryId);

    if (error) {
      console.error("Failed to unlike entry:", error);
      return { error: "いいねを取り消せませんでした" };
    }
  }

  revalidatePath("/shelf");
  revalidatePath("/likes");
}

/**
 * いいねに添える自分用メモを保存する。
 * フォローを解除した相手の投稿でも編集できる（本文は見えなくてもメモは残す仕様）。
 */
export async function updateLikeNote(
  entryId: string,
  note: string
): Promise<{ error?: string } | undefined> {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) {
    return { error: "ログインが必要です" };
  }

  const trimmed = note.trim();
  if (trimmed.length > NOTE_MAX_LENGTH) {
    return { error: `メモは${NOTE_MAX_LENGTH}文字以下で入力してください` };
  }

  // 0行更新を成功と誤判定しないよう、影響行を確認する
  const { data, error } = await supabase
    .from("post_likes")
    .update({ note: trimmed || null, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("entry_id", entryId)
    .select("entry_id");

  if (error) {
    console.error("Failed to update like note:", error);
    return { error: "メモを保存できませんでした" };
  }

  if (!data || data.length === 0) {
    return { error: "この投稿はいいねされていません" };
  }

  revalidatePath("/likes");
}
