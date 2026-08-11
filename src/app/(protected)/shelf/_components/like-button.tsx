"use client";

import { useState, useTransition } from "react";
import { toggleLike } from "../actions";

/**
 * いいねのトグル。
 * 押した瞬間に見た目を切り替え（楽観的更新）、失敗したら元に戻す。
 */
export function LikeButton({
  entryId,
  initialLiked,
}: {
  entryId: string;
  initialLiked: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    if (isPending) return;

    const next = !liked;
    setLiked(next);
    setError(null);

    startTransition(async () => {
      const result = await toggleLike(entryId, next);
      if (result?.error) {
        setLiked(!next); // 失敗したので戻す
        setError(result.error);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-pressed={liked}
        aria-label={liked ? "いいねを取り消す" : "いいねする"}
        className={`
          flex items-center gap-1 px-2 py-1.5 rounded-full text-xs font-medium
          transition-all active:scale-95 disabled:opacity-60
          ${
            liked
              ? "text-vermilion bg-vermilion/10"
              : "text-muted-foreground hover:text-vermilion hover:bg-vermilion/5"
          }
        `}
      >
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill={liked ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={1.8}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C6.1 3.75 4 5.765 4 8.25c0 7.22 8 11.25 8 11.25s8-4.03 8-11.25z"
          />
        </svg>
        {liked ? "いいね済み" : "いいね"}
      </button>
      {error && (
        <span role="alert" className="text-xs text-vermilion">
          {error}
        </span>
      )}
    </>
  );
}
