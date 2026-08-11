"use client";

import { useState, useTransition } from "react";
import { removeFriend, type Friend } from "../actions";

type Props = {
  friends: Friend[];
};

export function FriendsSection({ friends }: Props) {
  const [isPending, startTransition] = useTransition();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRemoveFriend = (shareId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await removeFriend(shareId);
      if (result.error) {
        // 失敗時は確認状態を維持して再試行できるようにする
        setError(result.error);
        return;
      }
      setConfirmingId(null);
    });
  };

  return (
    <section>
      <h2 className="text-lg font-bold text-foreground mb-4">
        フレンド
        {friends.length > 0 && (
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {friends.length}人
          </span>
        )}
      </h2>

      {error && (
        <div
          role="alert"
          className="mb-4 p-3 rounded-lg bg-vermilion/10 border border-vermilion/20"
        >
          <p className="text-sm text-vermilion">{error}</p>
        </div>
      )}

      {friends.length === 0 ? (
        <div className="p-6 rounded-2xl bg-muted/50 border border-border text-center">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-sm text-muted-foreground">
            まだフレンドがいません
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            招待コードを共有してフレンドを追加しましょう
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {friends.map((friend) => {
            const friendName = friend.display_name || "ユーザー";
            const isConfirming = confirmingId === friend.shareId;

            return (
              <div
                key={friend.shareId}
                className="p-4 rounded-xl bg-card border border-border"
              >
                <div className="flex items-center gap-3">
                  {/* アバター */}
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl">
                    {friend.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={friend.avatar_url}
                        alt={friendName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      "🍶"
                    )}
                  </div>

                  {/* ユーザー情報 */}
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{friendName}</p>
                    <p className="text-xs text-muted-foreground">
                      {/* ロケール依存の日付整形はサーバー/クライアントで差異が出るため警告を抑制 */}
                      <span suppressHydrationWarning>
                        {new Date(friend.since).toLocaleDateString("ja-JP")}
                      </span>
                      からフレンド
                    </p>
                  </div>

                  {/* アクションボタン */}
                  {isConfirming ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRemoveFriend(friend.shareId)}
                        disabled={isPending}
                        className="px-3 py-1.5 rounded-lg bg-vermilion text-white font-semibold text-sm hover:bg-vermilion/90 transition-colors disabled:opacity-50"
                      >
                        解除する
                      </button>
                      <button
                        onClick={() => setConfirmingId(null)}
                        disabled={isPending}
                        className="px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-foreground font-semibold text-sm hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors disabled:opacity-50"
                      >
                        キャンセル
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmingId(friend.shareId)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-vermilion hover:bg-vermilion/10 transition-colors"
                      aria-label="フレンド解除"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        フレンドを解除すると、お互いの棚が見えなくなります。
      </p>
    </section>
  );
}
