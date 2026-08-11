"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * 通知を既読にする（どこまで見たかを profiles.likes_seen_at に記録する）。
 *
 * 未読判定はこの時刻との比較で行うため、通知ごとの既読フラグは持たない。
 */
export async function markNotificationsSeen(): Promise<
  { error?: string } | undefined
> {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) {
    return { error: "ログインが必要です" };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ likes_seen_at: new Date().toISOString() })
    .eq("id", userId)
    .select("id");

  if (error) {
    console.error("Failed to mark notifications as seen:", error);
    return { error: "既読にできませんでした" };
  }

  // 0行更新を成功と誤判定しない
  if (!data || data.length === 0) {
    return { error: "既読にできませんでした" };
  }

  // ここでは revalidatePath を呼ばない。
  // サーバーアクション内で再検証すると現在のページも再描画されるため、
  // 表示した直後に「新着◯件」と未読の強調が消えてしまう。
  // 既読時刻はDBに保存済みなので、棚に戻れば（動的ページのため毎回再描画される）
  // ベルのバッジは消える。
}
