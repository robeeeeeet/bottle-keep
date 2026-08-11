import Image from "next/image";
import Link from "next/link";
import type { PostCardData } from "@/types/db";
import { LikeButton } from "./like-button";

/**
 * 投稿1件のカード。
 *
 * 3箇所で共通に使う:
 *  - 棚「自分」タブ    : variant="mine"      … 編集リンク＋いいね数
 *  - 棚「フォロー中」タブ: variant="following" … 投稿者名＋いいねボタン
 *  - いいね一覧        : variant="liked"     … 投稿者名＋自分用メモ
 */
type Props = {
  post: PostCardData;
  variant: "mine" | "following" | "liked";
  /** liked のとき、フォロー解除等で本文が見られない場合に true */
  unavailable?: boolean;
};

// YYYY-MM-DD形式の日付文字列をローカル日付として安全にパースして表示
function formatDrinkingDate(dateString: string): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div
      className="flex items-center gap-0.5"
      role="img"
      aria-label={`評価 ${rating} / 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          aria-hidden="true"
          className={`text-sm ${star <= rating ? "star-gold" : "star-empty"}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function AlcoholIcon({ type }: { type: string }) {
  const iconMap: Record<string, string> = {
    日本酒: "🍶",
    ワイン: "🍷",
    ビール: "🍺",
    ウイスキー: "🥃",
    焼酎: "🫗",
  };
  return (
    <span className="text-3xl opacity-60" aria-hidden="true">
      {iconMap[type] || "🍶"}
    </span>
  );
}

function LikeCount({ count }: { count: number }) {
  return (
    <span
      className="flex items-center gap-1 text-xs text-muted-foreground"
      title={`${count}件のいいね`}
    >
      <svg
        className="w-3.5 h-3.5"
        viewBox="0 0 24 24"
        fill="none"
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
      <span className="font-medium tabular-nums">{count}</span>
      <span className="sr-only">件のいいね</span>
    </span>
  );
}

export function PostCard({ post, variant, unavailable = false }: Props) {
  const alcoholName = post.alcohol?.name || "名称未設定";
  const authorName = post.author?.display_name || "ユーザー";

  // 本文が見られない状態（フォロー解除済みの相手の投稿）
  if (unavailable) {
    return (
      <div className="card-tatami overflow-hidden p-4">
        <p className="text-sm text-muted-foreground">
          この投稿は表示できません
          <span className="block text-xs mt-1 opacity-80">
            フォローを解除したため、内容が見られなくなりました。もう一度フォローすると表示されます。
          </span>
        </p>
        {post.myNote && (
          <p className="mt-3 pt-3 border-t border-border text-sm text-foreground">
            <span className="text-xs text-muted-foreground block mb-1">
              自分のメモ
            </span>
            {post.myNote}
          </p>
        )}
      </div>
    );
  }

  // 本文（タップで詳細/編集へ）
  const mainBlock = (
    <div className="flex gap-3 p-3">
        {/* 写真 */}
        {post.photo_url ? (
          <div className="w-20 h-20 relative rounded-lg overflow-hidden flex-shrink-0">
            <Image
              src={post.photo_url}
              alt={alcoholName}
              fill
              className="object-cover"
              sizes="80px"
            />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-lg photo-placeholder flex-shrink-0 flex items-center justify-center">
            <AlcoholIcon type={post.alcohol?.type || "日本酒"} />
          </div>
        )}

        {/* お酒情報 */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground leading-tight line-clamp-2">
            {alcoholName}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-primary/40"
              aria-hidden="true"
            />
            {post.alcohol?.type}
            {post.alcohol?.subtype && (
              <span className="opacity-70">/ {post.alcohol.subtype}</span>
            )}
          </p>
          {post.rating ? (
            <div className="mt-1.5">
              <StarRating rating={post.rating} />
            </div>
          ) : null}
          {post.memo && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5">
              {post.memo}
            </p>
          )}
        </div>

        {/* 詳細・編集へ進めることを示す矢印 */}
        <svg
          className="w-4 h-4 text-muted-foreground self-center flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5l7 7-7 7"
          />
        </svg>
    </div>
  );

  // フッターはリンクの外に置く（いいねボタンをリンクで囲むとタップが競合するため）
  const footer = (
    <div className="flex items-center gap-2 px-3 py-2 border-t border-border">
        {variant !== "mine" && (
          <span className="flex items-center gap-1.5 min-w-0">
            <span
              className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs flex-shrink-0"
              aria-hidden="true"
            >
              👤
            </span>
            <span className="text-xs text-accent font-medium truncate">
              {authorName}
            </span>
          </span>
        )}

        {post.drinking_date && (
          <span className="text-xs text-muted-foreground">
            {formatDrinkingDate(post.drinking_date)}
          </span>
        )}

        <span className="ml-auto flex items-center gap-3">
          {variant === "mine" ? (
            <LikeCount count={post.like_count} />
          ) : (
            <LikeButton
              entryId={post.id}
              initialLiked={post.likedByMe ?? false}
            />
          )}
        </span>
      </div>
  );

  // 自分の投稿は編集画面へ、他人の投稿は詳細画面へ
  const href =
    variant === "mine" ? `/shelf/${post.id}/edit` : `/shelf/${post.id}`;

  return (
    <div className="card-tatami overflow-hidden">
      <Link
        href={href}
        className="block active:scale-[0.99] transition-transform"
      >
        {mainBlock}
      </Link>
      {footer}
    </div>
  );
}
