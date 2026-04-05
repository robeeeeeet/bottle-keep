import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// 登録データの型定義
type AdminCollectionEntry = {
  id: string;
  photo_url: string | null;
  drinking_date: string | null;
  rating: number | null;
  memo: string | null;
  created_at: string;
  user_id: string;
  alcohol: {
    id: string;
    name: string;
    type: string;
    subtype: string | null;
  } | null;
  user: {
    id: string;
    display_name: string | null;
    email?: string;
  } | null;
};

// 日付フォーマット
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSimpleDate(dateString: string): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
  });
}

// 星評価コンポーネント
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`text-xs ${star <= rating ? "star-gold" : "star-empty"}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default async function AdminPage() {
  const supabase = await createClient();

  // 現在のユーザーを取得
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 管理者チェック
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/shelf");
  }

  // 全ユーザーの登録データを取得（管理者用RLSポリシーで許可）
  const { data: entries } = await supabase
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
      alcohol:alcohols (
        id,
        name,
        type,
        subtype
      ),
      user:profiles!collection_entries_profiles_fkey (
        id,
        display_name
      )
    `
    )
    .order("created_at", { ascending: false });

  // auth.usersからメールアドレスを取得するためのマップを作成
  // （管理者のみ実行可能）
  const { data: authUsers } = await supabase.rpc("get_user_emails_admin");

  const userEmailMap = new Map<string, string>();
  if (authUsers) {
    for (const u of authUsers) {
      userEmailMap.set(u.id, u.email);
    }
  }

  // ユーザー統計
  const { data: userStats } = await supabase
    .from("profiles")
    .select("id, display_name, created_at");

  const totalUsers = userStats?.length || 0;
  const totalEntries = entries?.length || 0;

  return (
    <div className="min-h-screen relative">
      {/* ヘッダー */}
      <header className="header-japanese sticky top-0 z-40 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/shelf"
              className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20 hover:bg-red-500/20 transition-colors"
              title="棚に戻る"
            >
              <svg
                className="w-5 h-5 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-red-500 tracking-wide">
                管理者ダッシュボード
              </h1>
              <p className="text-xs text-muted-foreground">
                {totalUsers}人のユーザー • {totalEntries}件の登録
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="px-4 pt-4 pb-24">
        {/* ナビゲーションカード */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link
            href="/admin/users"
            className="card-tatami p-4 text-center hover:bg-muted/50 transition-colors group"
          >
            <p className="text-3xl font-bold text-primary group-hover:scale-110 transition-transform">
              {totalUsers}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ユーザー一覧 →
            </p>
          </Link>
          <div className="card-tatami p-4 text-center">
            <p className="text-3xl font-bold text-primary">{totalEntries}</p>
            <p className="text-xs text-muted-foreground mt-1">総登録数</p>
          </div>
        </div>

        {/* 登録一覧 */}
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <span className="w-1 h-4 bg-primary rounded-full" />
          登録一覧（新しい順）
        </h2>

        {entries && entries.length > 0 ? (
          <div className="space-y-3">
            {(entries as unknown as AdminCollectionEntry[]).map((entry, index) => {
              const email = userEmailMap.get(entry.user_id) || "不明";
              return (
                <div
                  key={entry.id}
                  className={`card-tatami p-3 animate-in scale-in stagger-${Math.min(
                    index + 1,
                    6
                  )}`}
                >
                  <div className="flex gap-3">
                    {/* 写真 */}
                    {entry.photo_url ? (
                      <div className="w-16 h-16 relative rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={entry.photo_url}
                          alt={entry.alcohol?.name || "お酒の写真"}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-lg photo-placeholder flex-shrink-0 flex items-center justify-center">
                        <span className="text-2xl opacity-60">🍶</span>
                      </div>
                    )}

                    {/* 情報 */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-1">
                        {entry.alcohol?.name || "名称未設定"}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {entry.alcohol?.type}
                        {entry.alcohol?.subtype &&
                          ` / ${entry.alcohol.subtype}`}
                      </p>

                      {entry.rating && (
                        <div className="mt-1">
                          <StarRating rating={entry.rating} />
                        </div>
                      )}

                      {entry.memo && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                          {entry.memo}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* ユーザー情報 */}
                  <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center">
                        <span className="text-xs">👤</span>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">
                          {entry.user?.display_name || "名前なし"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {email}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">
                        {formatDate(entry.created_at)}
                      </p>
                      {entry.drinking_date && (
                        <p className="text-[10px] text-muted-foreground">
                          飲んだ日: {formatSimpleDate(entry.drinking_date)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            登録データがありません
          </div>
        )}
      </main>
    </div>
  );
}
