import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LikeButton } from "../_components/like-button";

/**
 * 投稿の詳細（読み取り専用）。
 *
 * 主にフォロー中の相手の投稿を開くための画面。
 * 参照できるのは「自分の投稿」と「フォロー中の相手の投稿」だけで、
 * これはRLSが強制する（該当しないIDは取得できず404になる）。
 */
type Props = {
  params: Promise<{ id: string }>;
};

type EntryDetail = {
  id: string;
  photo_url: string | null;
  drinking_date: string | null;
  rating: number | null;
  memo: string | null;
  created_at: string;
  user_id: string;
  like_count: number;
  alcohols: {
    name: string;
    type: string;
    subtype: string | null;
    brand: string | null;
    producer: string | null;
    origin_country: string | null;
    origin_region: string | null;
    alcohol_percentage: number | null;
    characteristics: string[] | null;
  } | null;
  author: {
    id: string;
    display_name: string | null;
  } | null;
};

function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div
      className="flex items-center gap-1"
      role="img"
      aria-label={`評価 ${rating} / 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          aria-hidden="true"
          className={`text-xl ${star <= rating ? "star-gold" : "star-empty"}`}
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
    <span className="text-6xl opacity-60" aria-hidden="true">
      {iconMap[type] || "🍶"}
    </span>
  );
}

/** 産地の表示（国と地域があれば繋げる） */
function formatOrigin(country: string | null, region: string | null): string | null {
  const parts = [country, region].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

export default async function PostDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const currentUserId = claimsData?.claims.sub;

  if (!currentUserId) {
    redirect("/login");
  }

  // 自分の投稿かフォロー中の相手の投稿のみ取得できる（RLS）
  const [entryResult, likeResult] = await Promise.all([
    supabase
      .from("collection_entries")
      .select(
        `
        id,
        photo_url,
        drinking_date,
        rating,
        memo,
        created_at,
        user_id,
        like_count,
        alcohols (
          name,
          type,
          subtype,
          brand,
          producer,
          origin_country,
          origin_region,
          alcohol_percentage,
          characteristics
        ),
        author:profiles!collection_entries_profiles_fkey (
          id,
          display_name
        )
      `
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("post_likes")
      .select("entry_id")
      .eq("user_id", currentUserId)
      .eq("entry_id", id)
      .maybeSingle(),
  ]);

  if (entryResult.error) {
    throw entryResult.error;
  }

  if (!entryResult.data) {
    notFound();
  }

  const entry = entryResult.data as unknown as EntryDetail;
  const isMine = entry.user_id === currentUserId;
  const likedByMe = likeResult.data !== null;
  const alcohol = entry.alcohols;
  const origin = formatOrigin(
    alcohol?.origin_country ?? null,
    alcohol?.origin_region ?? null
  );

  return (
    <div className="min-h-screen relative">
      {/* ヘッダー */}
      <header className="header-japanese sticky top-0 z-40 px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={isMine ? "/shelf" : "/shelf?tab=following"}
            className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
          >
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="text-sm">棚に戻る</span>
          </Link>
          <h1 className="text-lg font-bold text-primary">投稿</h1>
          {isMine ? (
            <Link
              href={`/shelf/${entry.id}/edit`}
              className="text-sm text-primary font-medium px-2 py-2 rounded-lg hover:bg-primary/5 transition-colors"
            >
              編集
            </Link>
          ) : (
            <span className="w-12" aria-hidden="true" />
          )}
        </div>
      </header>

      <main className="px-4 pt-4 pb-24 space-y-4">
        {/* 写真 */}
        <div className="card-tatami overflow-hidden">
          {entry.photo_url ? (
            <div className="relative w-full aspect-square">
              <Image
                src={entry.photo_url}
                alt={alcohol?.name || "お酒の写真"}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 640px"
                priority
              />
            </div>
          ) : (
            <div className="w-full aspect-square photo-placeholder flex items-center justify-center">
              <AlcoholIcon type={alcohol?.type || "日本酒"} />
            </div>
          )}
        </div>

        {/* お酒の情報 */}
        <div className="card-tatami p-4">
          <h2 className="text-xl font-bold text-foreground leading-tight">
            {alcohol?.name || "名称未設定"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-1.5">
            <span
              className="inline-block w-2 h-2 rounded-full bg-primary/40"
              aria-hidden="true"
            />
            {alcohol?.type}
            {alcohol?.subtype && (
              <span className="opacity-80">/ {alcohol.subtype}</span>
            )}
          </p>

          {/* 詳細情報（あるものだけ表示） */}
          {(alcohol?.brand ||
            alcohol?.producer ||
            origin ||
            alcohol?.alcohol_percentage) && (
            <dl className="mt-4 pt-4 border-t border-border grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              {alcohol?.brand && (
                <>
                  <dt className="text-muted-foreground">銘柄</dt>
                  <dd className="text-foreground">{alcohol.brand}</dd>
                </>
              )}
              {alcohol?.producer && (
                <>
                  <dt className="text-muted-foreground">製造</dt>
                  <dd className="text-foreground">{alcohol.producer}</dd>
                </>
              )}
              {origin && (
                <>
                  <dt className="text-muted-foreground">産地</dt>
                  <dd className="text-foreground">{origin}</dd>
                </>
              )}
              {alcohol?.alcohol_percentage && (
                <>
                  <dt className="text-muted-foreground">度数</dt>
                  <dd className="text-foreground">
                    {alcohol.alcohol_percentage}%
                  </dd>
                </>
              )}
            </dl>
          )}

          {/* 特徴 */}
          {alcohol?.characteristics && alcohol.characteristics.length > 0 && (
            <ul className="mt-4 pt-4 border-t border-border space-y-1.5">
              {alcohol.characteristics.map((feature, index) => (
                <li
                  key={index}
                  className="text-sm text-muted-foreground flex gap-2"
                >
                  <span className="text-gold flex-shrink-0" aria-hidden="true">
                    ・
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 感想 */}
        <div className="card-tatami p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="flex items-center gap-2 min-w-0">
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                  isMine
                    ? "bg-primary/10 text-primary"
                    : "bg-accent/10 text-accent"
                }`}
                aria-hidden="true"
              >
                {isMine ? "🍶" : "👤"}
              </span>
              <span
                className={`text-sm font-medium truncate ${
                  isMine ? "text-primary" : "text-accent"
                }`}
              >
                {isMine ? "自分" : entry.author?.display_name || "ユーザー"}
              </span>
            </span>
            {entry.drinking_date && (
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {formatDate(entry.drinking_date)}
              </span>
            )}
          </div>

          {entry.rating ? (
            <StarRating rating={entry.rating} />
          ) : (
            <p className="text-sm text-muted-foreground">評価なし</p>
          )}

          {entry.memo && (
            <p className="mt-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {entry.memo}
            </p>
          )}

          {/* いいね（自分の投稿なら数、他人の投稿ならボタン） */}
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-2">
            {isMine ? (
              <span className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground tabular-nums">
                  {entry.like_count}
                </span>
                件のいいね
              </span>
            ) : (
              <LikeButton entryId={entry.id} initialLiked={likedByMe} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
