import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// ユーザーデータの型定義
type UserWithStats = {
  id: string;
  display_name: string | null;
  email: string;
  created_at: string;
  is_admin: boolean;
  entry_count: number;
};

// RPC関数の戻り値型
type ProfileFromRpc = {
  id: string;
  display_name: string | null;
  is_admin: boolean;
  created_at: string;
};

// 日付フォーマット
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function AdminUsersPage() {
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

  // 全プロフィールを取得（管理者用SECURITY DEFINER関数）
  const { data: profiles } = await supabase.rpc("get_all_profiles_admin");

  // メールアドレスを取得
  const { data: authUsers } = await supabase.rpc("get_user_emails_admin");
  const userEmailMap = new Map<string, string>();
  if (authUsers) {
    for (const u of authUsers) {
      userEmailMap.set(u.id, u.email);
    }
  }

  // 各ユーザーの登録数を取得（管理者用関数から）
  const { data: allEntries } = await supabase.rpc("get_all_collection_entries_admin");

  const entryCountMap = new Map<string, number>();
  if (allEntries) {
    for (const entry of allEntries) {
      const count = entryCountMap.get(entry.user_id) || 0;
      entryCountMap.set(entry.user_id, count + 1);
    }
  }

  // ユーザーデータを統合
  const users: UserWithStats[] = ((profiles || []) as ProfileFromRpc[]).map((p) => ({
    id: p.id,
    display_name: p.display_name,
    email: userEmailMap.get(p.id) || "不明",
    created_at: p.created_at,
    is_admin: p.is_admin,
    entry_count: entryCountMap.get(p.id) || 0,
  }));

  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.is_admin).length;

  return (
    <div className="min-h-screen relative">
      {/* ヘッダー */}
      <header className="header-japanese sticky top-0 z-40 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20 hover:bg-red-500/20 transition-colors"
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
                ユーザー一覧
              </h1>
              <p className="text-xs text-muted-foreground">
                {totalUsers}人（管理者{adminCount}人）
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="px-4 pt-4 pb-24">
        {users.length > 0 ? (
          <div className="space-y-3">
            {users.map((userItem, index) => (
              <div
                key={userItem.id}
                className={`card-tatami p-4 animate-in scale-in stagger-${Math.min(
                  index + 1,
                  6
                )}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {/* アバター */}
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-lg ${
                        userItem.is_admin
                          ? "bg-red-500/10 text-red-500"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {userItem.is_admin ? "👑" : "👤"}
                    </div>

                    {/* ユーザー情報 */}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">
                          {userItem.display_name || "名前なし"}
                        </p>
                        {userItem.is_admin && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-red-500/10 text-red-500 rounded-full">
                            管理者
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {userItem.email}
                      </p>
                    </div>
                  </div>

                  {/* 統計（タップで詳細へ） */}
                  <Link
                    href={`/admin/users/${userItem.id}`}
                    className="text-right px-3 py-2 -mr-3 -my-2 rounded-lg hover:bg-primary/10 transition-colors"
                  >
                    <p className="text-lg font-bold text-primary">
                      {userItem.entry_count}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      登録数 →
                    </p>
                  </Link>
                </div>

                {/* フッター */}
                <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    登録日: {formatDate(userItem.created_at)}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {userItem.id.slice(0, 8)}...
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            ユーザーがいません
          </div>
        )}
      </main>
    </div>
  );
}
