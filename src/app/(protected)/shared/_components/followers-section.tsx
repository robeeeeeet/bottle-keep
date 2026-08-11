"use client";

import { useState, useTransition } from "react";
import { followBack, removeFollower } from "../actions";
import { FollowUserRow } from "./follow-user-row";
import type { FollowUser } from "@/types/db";

type Props = {
  users: FollowUser[];
};

/** どの行のどのボタンでスピナーを出すかを一意に決める */
type Pending = { id: string; action: "followBack" | "remove" } | null;

export function FollowersSection({ users }: Props) {
  const [isPending, startTransition] = useTransition();
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleFollowBack = (user: FollowUser) => {
    if (isPending) return;
    setError(null);
    setNotice(null);
    setPending({ id: user.id, action: "followBack" });
    startTransition(async () => {
      const result = await followBack(user.id);
      setPending(null);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setNotice(`${user.display_name || "ユーザー"}さんをフォローしました`);
    });
  };

  const handleRemove = (user: FollowUser) => {
    if (isPending) return;
    const name = user.display_name || "このユーザー";
    const confirmed = window.confirm(
      `${name}さんをフォロワーから外しますか？\n\n` +
        "・あなたの投稿が相手に表示されなくなります\n" +
        "・相手は招待リンクから再びフォローできます"
    );
    if (!confirmed) return;

    setError(null);
    setNotice(null);
    setPending({ id: user.id, action: "remove" });
    startTransition(async () => {
      const result = await removeFollower(user.id);
      setPending(null);
      if ("error" in result) {
        setError(result.error);
      }
    });
  };

  return (
    <section>
      <h2 className="text-lg font-bold text-foreground mb-4">
        フォロワー
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

      <p aria-live="polite" className="sr-only">
        {notice ?? ""}
      </p>

      {users.length === 0 ? (
        <div className="p-6 rounded-2xl bg-muted/50 border border-border text-center">
          <div className="text-4xl mb-3" aria-hidden="true">
            👥
          </div>
          <p className="text-sm text-muted-foreground">まだフォロワーがいません</p>
          <p className="text-xs text-muted-foreground mt-1">
            招待リンクやQRコードを共有してみましょう
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <FollowUserRow key={user.id} user={user} sinceLabel="からフォロー">
              <div className="flex items-center gap-2">
                {user.isMutual ? (
                  <span className="px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary font-semibold text-xs">
                    相互フォロー
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleFollowBack(user)}
                    disabled={isPending}
                    className="px-3 py-1.5 rounded-lg btn-primary-gradient text-primary-foreground font-semibold text-xs disabled:opacity-50 min-w-[5.5rem]"
                  >
                    {pending?.id === user.id &&
                    pending.action === "followBack" ? (
                      <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin inline-block" />
                    ) : (
                      "フォロー返し"
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleRemove(user)}
                  disabled={isPending}
                  aria-label={`${user.display_name || "ユーザー"}さんをフォロワーから外す`}
                  title="フォロワーから外す"
                  className="p-2 rounded-lg text-muted-foreground hover:text-vermilion hover:bg-vermilion/10 transition-colors disabled:opacity-50"
                >
                  {pending?.id === user.id && pending.action === "remove" ? (
                    <span className="w-5 h-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin inline-block" />
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </FollowUserRow>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        フォロワーはあなたの投稿を見られます。フォロー返しをすると、相手の投稿もあなたの「フォロー中」に表示されます。
      </p>
    </section>
  );
}
