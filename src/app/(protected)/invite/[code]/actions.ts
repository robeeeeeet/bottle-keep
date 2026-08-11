"use server";

import { redirect } from "next/navigation";
import { followViaInvite } from "../../shared/actions";

/**
 * 招待リンクの確認画面から呼ばれるフォロー実行アクション。
 * 成功時はフォロー中タブへ遷移するため戻り値なし（redirectが例外を投げる）。
 */
export async function acceptInvite(
  code: string
): Promise<{ error: string } | void> {
  const result = await followViaInvite(code);

  if ("error" in result) {
    return { error: result.error };
  }

  redirect("/shelf?tab=following");
}
