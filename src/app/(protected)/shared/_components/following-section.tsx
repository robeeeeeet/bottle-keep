"use client";

import { useState, useTransition } from "react";
import { unfollow } from "../actions";
import { FollowUserRow } from "./follow-user-row";
import type { FollowUser } from "@/types/db";

type Props = {
  users: FollowUser[];
};

export function FollowingSection({ users }: Props) {
  const [isPending, startTransition] = useTransition();
  /** スピナーを出す対象を1件に限定する（他の行のボタンには出さない） */
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUnfollow = (user: FollowUser) => {
    if (isPending) return;
    const name = user.display_name || "このユーザー";
    const confirmed = window.confirm(
      `${name}さんのフォローを解除しますか？\n\n` +
        "・相手の投稿が「フォロー中」に表示されなくなります\n" +
        "・相手には通知されません"
    );
    if (!confirmed) return;

    setError(null);
    setPendingId(user.id);
    startTransition(async () => {
      const result = await unfollow(user.id);
      setPendingId(null);
      if ("error" in result) {
        setError(result.error);
      }
    });
  };

  return (
    <section>
      <h2 className="text-lg font-bold text-foreground mb-4">
        フォロー中
        {users.length > 0 && (
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {users.length}人
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

      {users.length === 0 ? (
        <div className="p-6 rounded-2xl bg-muted/50 border border-border text-center">
          <div className="text-4xl mb-3" aria-hidden="true">
            👀
          </div>
          <p className="text-sm text-muted-foreground">
            まだ誰もフォローしていません
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            相手の招待QRを読み取るとフォローできます
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <FollowUserRow
              key={user.id}
              user={user}
              sinceLabel="からフォロー中"
            >
              <button
                type="button"
                onClick={() => handleUnfollow(user)}
                disabled={isPending}
                className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground font-semibold text-xs hover:text-vermilion hover:bg-vermilion/10 transition-colors disabled:opacity-50 min-w-[5.5rem]"
              >
                {pendingId === user.id ? (
                  <span className="w-3.5 h-3.5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin inline-block" />
                ) : (
                  "フォロー解除"
                )}
              </button>
            </FollowUserRow>
          ))}
        </div>
      )}
    </section>
  );
}
