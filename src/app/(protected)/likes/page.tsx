import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HeaderActions } from "@/components/layout/header-actions";
import type { PostCardData } from "@/types/db";
import { LikedPost } from "./_components/liked-post";

/**
 * いいね一覧（ブックマーク）。
 *
 * いいね自体は post_likes に残るが、投稿本文の可視性はRLSが
 * 「現在フォローしているか」で判断する。そのためフォローを解除した相手の
 * 投稿は本文が取得できない（= unavailable）。その場合も自分のメモは表示する。
 */
export default async function LikesPage() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const currentUserId = claimsData?.claims.sub;

  if (!currentUserId) {
    redirect("/login");
  }

  // いいねの一覧（新しい順）。本文はRLS次第で取得できないことがある
  const { data: likes, error } = await supabase
    .from("post_likes")
    .select(
      `
      entry_id,
      note,
      created_at,
      entry:collection_entries (
        id,
        photo_url,
        drinking_date,
        rating,
        memo,
        created_at,
        user_id,
        like_count,
        alcohols (
          id,
          name,
          type,
          subtype
        ),
        author:profiles!collection_entries_profiles_fkey (
          id,
          display_name,
          avatar_url
        )
      )
    `
    )
    .eq("user_id", currentUserId)
    .order("created_at", { ascending: false });

  // 取得失敗を空状態と誤認させない
  if (error) {
    throw error;
  }

  type LikeRow = {
    entry_id: string;
    note: string | null;
    created_at: string;
    entry: {
      id: string;
      photo_url: string | null;
      drinking_date: string | null;
      rating: number | null;
      memo: string | null;
      created_at: string;
      user_id: string;
      like_count: number;
      alcohols: {
        id: string;
        name: string;
        type: string;
        subtype: string | null;
      } | null;
      author: {
        id: string;
        display_name: string | null;
        avatar_url: string | null;
      } | null;
    } | null;
  };

  const rows = (likes ?? []) as unknown as LikeRow[];

  const items = rows.map((row) => {
    const post: PostCardData = row.entry
      ? {
          id: row.entry.id,
          photo_url: row.entry.photo_url,
          drinking_date: row.entry.drinking_date,
          rating: row.entry.rating,
          memo: row.entry.memo,
          created_at: row.entry.created_at,
          user_id: row.entry.user_id,
          like_count: row.entry.like_count,
          alcohol: row.entry.alcohols,
          author: row.entry.author,
          likedByMe: true,
          myNote: row.note,
        }
      : {
          // 本文が取得できない場合（フォロー解除済み）
          id: row.entry_id,
          photo_url: null,
          drinking_date: null,
          rating: null,
          memo: null,
          created_at: row.created_at,
          user_id: "",
          like_count: 0,
          alcohol: null,
          author: null,
          likedByMe: true,
          myNote: row.note,
        };

    return { post, unavailable: row.entry === null };
  });

  return (
    <div className="min-h-screen relative">
      {/* ヘッダー */}
      <header className="header-japanese sticky top-0 z-40 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-vermilion/10 flex items-center justify-center border border-vermilion/20">
              <svg
                className="w-5 h-5 text-vermilion"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C6.1 3.75 4 5.765 4 8.25c0 7.22 8 11.25 8 11.25s8-4.03 8-11.25z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary tracking-wide">
                いいね
              </h1>
              <p className="text-xs text-muted-foreground">
                {items.length}件の投稿
              </p>
            </div>
          </div>
          <HeaderActions />
        </div>
      </header>

      <main className="px-4 pt-4 pb-24">
        {items.length > 0 ? (
          <div className="space-y-3">
            {items.map(({ post, unavailable }) => (
              <LikedPost
                key={post.id}
                post={post}
                unavailable={unavailable}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in">
            <div className="empty-state-icon mb-6">
              <svg
                className="w-16 h-16 text-vermilion/25"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C6.1 3.75 4 5.765 4 8.25c0 7.22 8 11.25 8 11.25s8-4.03 8-11.25z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-primary mb-2">
              まだいいねした投稿がありません
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              フォロー中の人の投稿にいいねすると
              <br />
              ここに集まります（自分用のメモも残せます）
            </p>
            <Link
              href="/shelf?tab=following"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              フォロー中の投稿を見る
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
