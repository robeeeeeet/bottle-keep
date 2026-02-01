import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/(auth)/actions/auth";
import { HeaderActions } from "@/components/layout/header-actions";
import { ShelfFilter } from "./_components/shelf-filter";

// コレクションエントリの型定義
type CollectionEntry = {
  id: string;
  photo_url: string | null;
  drinking_date: string | null;
  rating: number | null;
  memo: string | null;
  user_id: string;
  alcohol_id: string;
  alcohols: {
    id: string;
    name: string;
    type: string;
    subtype: string | null;
    brand: string | null;
  } | null;
  user: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

// グループ化されたお酒の型
type GroupedAlcohol = {
  alcoholId: string;
  alcohol: CollectionEntry["alcohols"];
  entries: CollectionEntry[];
  maxRating: number;
  hasMyReview: boolean;
  photoUrl: string | null;
};

// 星評価コンポーネント
function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "xs" }) {
  const sizeClass = size === "xs" ? "text-xs" : "text-sm";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`${sizeClass} ${
            star <= rating ? "star-gold" : "star-empty"
          }`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

// お酒の種類に応じたアイコン
function AlcoholIcon({ type }: { type: string }) {
  const iconMap: Record<string, string> = {
    日本酒: "🍶",
    ワイン: "🍷",
    ビール: "🍺",
    ウイスキー: "🥃",
    焼酎: "🫗",
  };
  return <span className="text-3xl opacity-60">{iconMap[type] || "🍶"}</span>;
}

// 検索パラメータの型定義
type SearchParams = {
  sort?: string;
  order?: string;
  type?: string;
  minRating?: string;
};

export default async function ShelfPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  // 現在のユーザーを取得
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id;

  // パラメータのデフォルト値
  const sortField = params.sort || "created_at";
  const sortOrder = params.order !== "asc"; // デフォルトはdesc（ascending: false）
  const filterType = params.type || "";
  const minRating = params.minRating ? parseInt(params.minRating) : null;

  // フィルタが適用されているか
  const hasFilters = filterType !== "" || minRating !== null;

  // クエリを構築（フレンドのエントリーも取得 - RLSで自動フィルタ）
  // user:profiles!collection_entries_profiles_fkey で明示的に外部キーを指定
  let query = supabase.from("collection_entries").select(
    `
      id,
      photo_url,
      drinking_date,
      rating,
      memo,
      user_id,
      alcohol_id,
      alcohols (
        id,
        name,
        type,
        subtype,
        brand
      ),
      user:profiles!collection_entries_profiles_fkey (
        id,
        display_name,
        avatar_url
      )
    `
  );


  // 種類フィルタ
  if (filterType) {
    query = query.eq("alcohols.type", filterType);
  }

  // 評価フィルタ
  if (minRating !== null) {
    query = query.gte("rating", minRating);
  }

  // ソート
  query = query.order(sortField, {
    ascending: sortOrder,
    nullsFirst: false,
  });

  const { data: entries } = (await query) as {
    data: CollectionEntry[] | null;
  };

  // alcohol_idでグループ化
  const groupedAlcohols: GroupedAlcohol[] = [];
  const alcoholMap = new Map<string, GroupedAlcohol>();

  if (entries) {
    for (const entry of entries) {
      const alcoholId = entry.alcohol_id;

      if (!alcoholMap.has(alcoholId)) {
        alcoholMap.set(alcoholId, {
          alcoholId,
          alcohol: entry.alcohols,
          entries: [],
          maxRating: 0,
          hasMyReview: false,
          photoUrl: null,
        });
      }

      const group = alcoholMap.get(alcoholId)!;
      group.entries.push(entry);

      // 最高評価を更新
      if (entry.rating && entry.rating > group.maxRating) {
        group.maxRating = entry.rating;
      }

      // 自分のレビューがあるか
      if (entry.user_id === currentUserId) {
        group.hasMyReview = true;
      }

      // 写真URL（最初に見つかったものを使用、自分のを優先）
      if (entry.photo_url) {
        if (!group.photoUrl || entry.user_id === currentUserId) {
          group.photoUrl = entry.photo_url;
        }
      }
    }

    // Mapから配列に変換
    for (const group of alcoholMap.values()) {
      groupedAlcohols.push(group);
    }

    // 評価順の場合は最高評価でソート
    if (sortField === "rating") {
      groupedAlcohols.sort((a, b) =>
        sortOrder ? a.maxRating - b.maxRating : b.maxRating - a.maxRating
      );
    }
  }

  // ユニークなお酒の数をカウント
  const uniqueAlcoholCount = groupedAlcohols.length;
  const totalEntryCount = entries?.length || 0;
  const hasFriendEntries = totalEntryCount > uniqueAlcoholCount ||
    (entries?.some(e => e.user_id !== currentUserId) ?? false);

  return (
    <div className="min-h-screen relative">
      {/* ヘッダー */}
      <header className="header-japanese sticky top-0 z-40 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* 印鑑風ロゴ */}
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
              <span className="text-primary text-lg">酒</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary tracking-wide">
                {hasFriendEntries ? "みんなの棚" : "マイ棚"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {uniqueAlcoholCount}種類のお酒
                {hasFriendEntries && ` • ${totalEntryCount}件のレビュー`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <HeaderActions />
            <form action={logout}>
              <button
                type="submit"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-2 rounded-lg hover:bg-muted"
                title="ログアウト"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* フィルタバー */}
      <ShelfFilter />

      {/* メインコンテンツ */}
      <main className="px-4 pt-4 pb-24">
        {groupedAlcohols.length > 0 ? (
          <div className="space-y-4">
            {groupedAlcohols.map((group, index) => (
              <div
                key={group.alcoholId}
                className={`
                  card-tatami animate-in scale-in overflow-hidden
                  stagger-${Math.min(index + 1, 6)}
                `}
              >
                {/* お酒情報ヘッダー */}
                <div className="flex gap-3 p-3">
                  {/* 写真 */}
                  {group.photoUrl ? (
                    <div className="w-20 h-20 relative rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={group.photoUrl}
                        alt={group.alcohol?.name || "お酒の写真"}
                        fill
                        className="object-cover"
                        sizes="80px"
                        priority={index < 2}
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-lg photo-placeholder flex-shrink-0 flex items-center justify-center">
                      <AlcoholIcon type={group.alcohol?.type || "日本酒"} />
                    </div>
                  )}

                  {/* お酒情報 */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground leading-tight line-clamp-2">
                      {group.alcohol?.name || "名称未設定"}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/40" />
                      {group.alcohol?.type}
                      {group.alcohol?.subtype && (
                        <span className="opacity-70">
                          / {group.alcohol.subtype}
                        </span>
                      )}
                    </p>
                    {group.maxRating > 0 && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <StarRating rating={group.maxRating} />
                        {group.entries.length > 1 && (
                          <span className="text-xs text-muted-foreground">
                            （最高）
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* レビュー一覧 */}
                <div className="border-t border-border">
                  {group.entries.map((entry, entryIndex) => {
                    const isMe = entry.user_id === currentUserId;
                    const userName = isMe
                      ? "自分"
                      : entry.user?.display_name || "ユーザー";

                    const entryContent = (
                      <>
                        {/* アバター */}
                        <div
                          className={`
                            w-8 h-8 rounded-full flex items-center justify-center text-sm
                            ${isMe ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}
                          `}
                        >
                          {entry.user?.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={entry.user.avatar_url}
                              alt={userName}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            isMe ? "🍶" : "👤"
                          )}
                        </div>

                        {/* レビュー内容 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-medium ${
                                isMe ? "text-primary" : "text-accent"
                              }`}
                            >
                              {userName}
                            </span>
                            {entry.rating && (
                              <StarRating rating={entry.rating} size="xs" />
                            )}
                          </div>
                          {entry.memo && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {entry.memo}
                            </p>
                          )}
                        </div>

                        {/* 日付・編集アイコン */}
                        <div className="flex items-center gap-2">
                          {entry.drinking_date && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(entry.drinking_date).toLocaleDateString(
                                "ja-JP",
                                { month: "short", day: "numeric" }
                              )}
                            </span>
                          )}
                          {isMe && (
                            <svg
                              className="w-4 h-4 text-muted-foreground"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          )}
                        </div>
                      </>
                    );

                    // 自分のエントリーはリンク、フレンドのは静的表示
                    return isMe ? (
                      <Link
                        key={entry.id}
                        href={`/shelf/${entry.id}/edit`}
                        className={`
                          flex items-center gap-3 px-3 py-2.5
                          ${entryIndex > 0 ? "border-t border-border/50" : ""}
                          hover:bg-muted/50 active:scale-[0.99]
                          transition-all
                        `}
                      >
                        {entryContent}
                      </Link>
                    ) : (
                      <div
                        key={entry.id}
                        className={`
                          flex items-center gap-3 px-3 py-2.5 cursor-default
                          ${entryIndex > 0 ? "border-t border-border/50" : ""}
                        `}
                      >
                        {entryContent}
                      </div>
                    );
                  })}

                  {/* 自分も評価するボタン（自分のレビューがない場合） */}
                  {!group.hasMyReview && (
                    <Link
                      href={`/add?alcoholId=${group.alcoholId}&name=${encodeURIComponent(group.alcohol?.name || "")}`}
                      className="flex items-center justify-center gap-2 px-3 py-2.5 border-t border-border/50 text-sm text-primary font-medium hover:bg-primary/5 transition-colors"
                    >
                      <span>+</span>
                      自分も評価する
                    </Link>
                  )}
                </div>
              </div>
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
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
            </div>

            <h2 className="text-lg font-bold text-primary mb-2">
              条件に一致するお酒がありません
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              フィルタ条件を変更してみてください
            </p>

            <Link
              href="/shelf"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              フィルタをクリア
            </Link>
          </div>
        ) : (
          /* 空状態（コレクションが空） */
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in">
            {/* 水墨画風イラスト */}
            <div className="empty-state-icon mb-6 animate-float">
              <svg
                className="w-16 h-16 text-primary/30"
                viewBox="0 0 64 64"
                fill="none"
                stroke="currentColor"
                strokeWidth={1}
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

            {/* ヒント */}
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
