import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HeaderActions } from "@/components/layout/header-actions";
import type { PostCardData } from "@/types/db";
import { ShelfFilter } from "./_components/shelf-filter";
import { LogoutButton } from "./_components/logout-button";
import { ShelfTabs } from "./_components/shelf-tabs";
import { PostCard } from "./_components/post-card";

// 検索パラメータの型定義
type SearchParams = {
  tab?: string;
  sort?: string;
  order?: string;
  type?: string;
  minRating?: string;
};

// 不正な値でクエリが失敗して「投稿ゼロ」に見えるのを防ぐため、
// 並び替えに使える列はホワイトリストで固定する
const SORT_FIELDS = ["created_at", "rating", "drinking_date"] as const;
type SortField = (typeof SORT_FIELDS)[number];

function parseSortField(value: string | undefined): SortField {
  return SORT_FIELDS.includes(value as SortField)
    ? (value as SortField)
    : "created_at";
}

function parseMinRating(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) return null;
  return parsed;
}

type Tab = "mine" | "following";

function parseTab(value: string | undefined): Tab {
  return value === "following" ? "following" : "mine";
}

// Supabaseの埋め込み結果は型推論が配列になるため、必要な形へ寄せる
type EntryRow = {
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
};

const SELECT_COLUMNS = `
  id,
  photo_url,
  drinking_date,
  rating,
  memo,
  created_at,
  user_id,
  like_count,
  alcohols!inner (
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
`;

export default async function ShelfPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  // 現在のユーザーをJWTからローカル取得（Authサーバーへの往復なし）
  const { data: claimsData } = await supabase.auth.getClaims();
  const currentUserId = claimsData?.claims.sub;

  // 未認証時はuuidが空になりクエリが失敗するのでログインへ
  if (!currentUserId) {
    redirect("/login");
  }

  const tab = parseTab(params.tab);
  const sortField = parseSortField(params.sort);
  const ascending = params.order === "asc"; // デフォルトはdesc（新しい順）
  const filterType = params.type || "";
  const minRating = parseMinRating(params.minRating);
  const hasFilters = filterType !== "" || minRating !== null;

  // 投稿の取得。RLSが「自分＋フォロー中の人」に絞るので、
  // タブごとに user_id の条件だけを切り替える。
  let query = supabase.from("collection_entries").select(SELECT_COLUMNS);

  if (tab === "mine") {
    query = query.eq("user_id", currentUserId);
  } else {
    query = query.neq("user_id", currentUserId);
  }

  if (filterType) {
    // 埋め込みへの .eq は alcohols!inner と併用しないと親行が絞られない
    query = query.eq("alcohols.type", filterType);
  }

  if (minRating !== null) {
    query = query.gte("rating", minRating);
  }

  query = query.order(sortField, { ascending, nullsFirst: false });

  // フォロー中タブでは、どの投稿に自分がいいね済みかも必要になる
  const [entriesResult, profileResult, likesResult, unreadResult] =
    await Promise.all([
      query,
      supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", currentUserId)
        .single(),
      tab === "following"
        ? supabase
            .from("post_likes")
            .select("entry_id")
            .eq("user_id", currentUserId)
        : Promise.resolve({ data: [], error: null }),
      // 自分の投稿への未読いいね件数（ベルのバッジ用）
      supabase.rpc("count_unread_likes"),
    ]);

  // 取得に失敗した場合は空状態と誤認させず、error.tsxに拾わせる
  if (entriesResult.error) {
    throw entriesResult.error;
  }

  const isAdmin = profileResult.data?.is_admin || false;
  const unreadLikes = unreadResult.data ?? 0;
  const rows = (entriesResult.data ?? []) as unknown as EntryRow[];
  const likedEntryIds = new Set(
    (likesResult.data ?? []).map((like) => like.entry_id)
  );

  const posts: PostCardData[] = rows.map((row) => ({
    id: row.id,
    photo_url: row.photo_url,
    drinking_date: row.drinking_date,
    rating: row.rating,
    memo: row.memo,
    created_at: row.created_at,
    user_id: row.user_id,
    like_count: row.like_count,
    alcohol: row.alcohols,
    author: row.author,
    likedByMe: likedEntryIds.has(row.id),
  }));

  const totalLikes =
    tab === "mine" ? posts.reduce((sum, p) => sum + p.like_count, 0) : 0;

  return (
    <div className="min-h-screen relative">
      {/* ヘッダー */}
      <header className="header-japanese sticky top-0 z-40 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* 印鑑風ロゴ */}
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
              <span className="text-primary text-lg" aria-hidden="true">
                酒
              </span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary tracking-wide">
                {tab === "mine" ? "マイ棚" : "フォロー中"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {posts.length}件の投稿
                {tab === "mine" && totalLikes > 0 && ` • ${totalLikes}件のいいね`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* 管理者用リンク */}
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-400 transition-colors px-2 py-2 rounded-lg hover:bg-red-500/10"
                title="管理者ページ"
                aria-label="管理者ページ"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </Link>
            )}
            {/* お知らせ（自分の投稿へのいいね） */}
            <Link
              href="/notifications"
              className="relative flex items-center text-muted-foreground hover:text-foreground transition-colors px-2 py-2 rounded-lg hover:bg-muted"
              aria-label={
                unreadLikes > 0
                  ? `お知らせ（未読${unreadLikes}件）`
                  : "お知らせ"
              }
              title="お知らせ"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                />
              </svg>
              {unreadLikes > 0 && (
                <span
                  className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-vermilion text-[10px] font-bold text-white flex items-center justify-center tabular-nums"
                  aria-hidden="true"
                >
                  {unreadLikes > 9 ? "9+" : unreadLikes}
                </span>
              )}
            </Link>
            <HeaderActions />
            <LogoutButton />
          </div>
        </div>
      </header>

      {/*
        タブとフィルタは1つのsticky枠にまとめる。
        個別にstickyにすると同じ位置で重なってしまうため。
      */}
      <div className="sticky top-[73px] z-30 bg-background/95 backdrop-blur-sm">
        <ShelfTabs activeTab={tab} />
        <ShelfFilter />
      </div>

      {/* メインコンテンツ */}
      <main className="px-4 pt-4 pb-24">
        {posts.length > 0 ? (
          <div className="space-y-3">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                variant={tab === "mine" ? "mine" : "following"}
              />
            ))}
          </div>
        ) : hasFilters ? (
          /* フィルタ適用中の空状態 */
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in">
            <div className="empty-state-icon mb-6">
              <svg
                className="w-16 h-16 text-primary/30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-primary mb-2">
              条件に一致する投稿がありません
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              フィルタ条件を変更してみてください
            </p>
            <Link
              href={`/shelf?tab=${tab}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              フィルタをクリア
            </Link>
          </div>
        ) : tab === "following" ? (
          /* フォロー中に投稿がない場合 */
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in">
            <div className="empty-state-icon mb-6">
              <svg
                className="w-16 h-16 text-primary/30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.2}
                aria-hidden="true"
              >
                <circle cx="9" cy="8" r="3" />
                <path d="M4 20a5 5 0 0110 0" />
                <path d="M17 11h4M19 9v4" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-primary mb-2">
              まだフォローしている人がいません
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              招待リンクやQRコードから
              <br />
              お酒好きの友人をフォローしましょう
            </p>
            <Link
              href="/shared"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              フォローを管理する
            </Link>
          </div>
        ) : (
          /* 自分の投稿がない場合 */
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in">
            <div className="empty-state-icon mb-6 animate-float">
              <svg
                className="w-16 h-16 text-primary/30"
                viewBox="0 0 64 64"
                fill="none"
                stroke="currentColor"
                strokeWidth={1}
                aria-hidden="true"
              >
                {/* 徳利 */}
                <path d="M26 16c0-2 2-4 6-4s6 2 6 4" strokeWidth={1.5} />
                <path d="M26 16v4c0 1-2 2-2 6v18c0 3 3 6 8 6s8-3 8-6V26c0-4-2-5-2-6v-4" />
                {/* 盃 */}
                <path d="M16 52c0 0 2 6 8 6s8-6 8-6" strokeWidth={1.5} />
                <path d="M24 58v4" />
                <path d="M20 62h8" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-primary mb-2">
              まだお酒がありません
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              下の「追加」ボタンから
              <br />
              お気に入りのお酒を登録しましょう
            </p>
            <div className="mt-8 px-4 py-3 bg-muted rounded-lg border border-border-light max-w-xs">
              <p className="text-xs text-muted-foreground">
                <span className="text-gold font-medium">ヒント：</span>
                ラベルを撮影すると、AIが銘柄を自動で認識します
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
