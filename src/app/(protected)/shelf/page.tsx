import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/(auth)/actions/auth";
import { HeaderActions } from "@/components/layout/header-actions";

// コレクションエントリの型定義
type CollectionEntry = {
  id: string;
  photo_url: string | null;
  drinking_date: string | null;
  rating: number | null;
  memo: string | null;
  alcohols: {
    id: string;
    name: string;
    type: string;
    subtype: string | null;
    brand: string | null;
  } | null;
};

// 星評価コンポーネント
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5 mt-1.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`text-sm ${
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

export default async function ShelfPage() {
  const supabase = await createClient();

  // コレクションを取得
  const { data: entries } = (await supabase
    .from("collection_entries")
    .select(
      `
      id,
      photo_url,
      drinking_date,
      rating,
      memo,
      alcohols (
        id,
        name,
        type,
        subtype,
        brand
      )
    `
    )
    .order("created_at", { ascending: false })) as {
    data: CollectionEntry[] | null;
  };

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
                マイ棚
              </h1>
              <p className="text-xs text-muted-foreground">
                {entries?.length || 0}本のコレクション
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

      {/* メインコンテンツ */}
      <main className="px-4 pt-4 pb-24">
        {entries && entries.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {entries.map((entry, index) => (
              <article
                key={entry.id}
                className={`
                  card-tatami animate-in scale-in
                  stagger-${Math.min(index + 1, 6)}
                `}
              >
                {/* 写真エリア */}
                {entry.photo_url ? (
                  <div className="aspect-square relative overflow-hidden">
                    <Image
                      src={entry.photo_url}
                      alt={entry.alcohols?.name || "お酒の写真"}
                      fill
                      className="object-cover transition-transform duration-500 hover:scale-105"
                      sizes="(max-width: 768px) 50vw, 33vw"
                      priority={index < 4}
                      loading={index < 4 ? "eager" : "lazy"}
                    />
                    {/* 写真下部のグラデーションオーバーレイ */}
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/30 to-transparent" />
                  </div>
                ) : (
                  <div className="aspect-square photo-placeholder">
                    <AlcoholIcon type={entry.alcohols?.type || "日本酒"} />
                  </div>
                )}

                {/* 情報エリア */}
                <div className="p-3">
                  <h3 className="font-semibold text-sm text-foreground leading-tight line-clamp-2">
                    {entry.alcohols?.name || "名称未設定"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/40" />
                    {entry.alcohols?.type}
                    {entry.alcohols?.subtype && (
                      <span className="opacity-70">
                        / {entry.alcohols.subtype}
                      </span>
                    )}
                  </p>
                  {entry.rating && <StarRating rating={entry.rating} />}
                </div>
              </article>
            ))}
          </div>
        ) : (
          /* 空状態 */
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
