"use client";

import type { FollowUser } from "@/types/db";

type Props = {
  user: FollowUser;
  /** 日付の後ろに付ける説明（例: 「からフォロー中」） */
  sinceLabel: string;
  /** 右側に置くアクションボタン */
  children?: React.ReactNode;
};

/** フォロー中／フォロワー一覧で共通のユーザー行 */
export function FollowUserRow({ user, sinceLabel, children }: Props) {
  const name = user.display_name || "ユーザー";

  return (
    <div className="p-4 rounded-xl bg-card border border-border">
      <div className="flex items-center gap-3">
        {/* アバター */}
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl flex-shrink-0">
          {user.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatar_url}
              alt={name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span aria-hidden="true">🍶</span>
          )}
        </div>

        {/* ユーザー情報 */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{name}</p>
          <p className="text-xs text-muted-foreground">
            {/* ロケール依存の日付整形はサーバー/クライアントで差異が出るため警告を抑制 */}
            <span suppressHydrationWarning>
              {new Date(user.since).toLocaleDateString("ja-JP")}
            </span>
            {sinceLabel}
          </p>
        </div>

        {/* アクション */}
        {children && <div className="flex-shrink-0">{children}</div>}
      </div>
    </div>
  );
}
