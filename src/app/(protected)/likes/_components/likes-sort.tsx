"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import {
  LIKES_SORT_FIELDS,
  LIKES_SORT_LABELS,
  type LikesSortField,
} from "../sort";

/**
 * いいね一覧の並び替え（いいねした日 / 投稿日 × 昇順・降順）。
 * URLパラメータで状態を持つため、並び替えはサーバー側で反映される。
 */
export function LikesSort({
  activeField,
  ascending,
}: {
  activeField: LikesSortField;
  ascending: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      const queryString = params.toString();
      router.push(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-border-light">
      {LIKES_SORT_FIELDS.map((field) => {
        const isActive = field === activeField;
        return (
          <button
            key={field}
            type="button"
            onClick={() => updateParams("sort", field === "liked" ? null : field)}
            aria-pressed={isActive}
            className={`
              flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium
              border transition-all duration-200
              ${
                isActive
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-border bg-muted text-foreground hover:border-primary/50"
              }
            `}
          >
            <span aria-hidden="true">{LIKES_SORT_LABELS[field].icon}</span>
            {LIKES_SORT_LABELS[field].label}
          </button>
        );
      })}

      {/* 昇順・降順の切り替え */}
      <button
        type="button"
        onClick={() => updateParams("order", ascending ? null : "asc")}
        aria-label={
          ascending ? "昇順（古い順）。押すと降順に変わります" : "降順（新しい順）。押すと昇順に変わります"
        }
        className="flex items-center gap-1 px-2.5 py-2 rounded-full text-sm font-medium border border-border bg-muted text-foreground hover:border-primary/50 transition-all"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          {ascending ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4h13M3 8h9M3 12h5m4 4v-4m0 0l3 3m-3-3l-3 3"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4h13M3 8h9M3 12h9m4-4v4m0 0l3-3m-3 3l-3-3"
            />
          )}
        </svg>
        <span className="text-xs">{ascending ? "昇順" : "降順"}</span>
      </button>
    </div>
  );
}
