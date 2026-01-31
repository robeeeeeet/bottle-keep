import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/(auth)/actions/auth";

export default async function ShelfPage() {
  const supabase = await createClient();

  // コレクションを取得
  const { data: entries } = await supabase
    .from("collection_entries")
    .select(`
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
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="px-4 pt-4">
      {/* ヘッダー */}
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">マイ棚</h1>
        <form action={logout}>
          <button
            type="submit"
            className="text-sm text-foreground/60 hover:text-foreground"
          >
            ログアウト
          </button>
        </form>
      </header>

      {/* コレクショングリッド */}
      {entries && entries.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-foreground/5 rounded-xl overflow-hidden"
            >
              {entry.photo_url ? (
                <div className="aspect-square bg-foreground/10 relative">
                  <Image
                    src={entry.photo_url}
                    alt={entry.alcohols?.name || "お酒の写真"}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                </div>
              ) : (
                <div className="aspect-square bg-foreground/10 flex items-center justify-center">
                  <span className="text-4xl">🍶</span>
                </div>
              )}
              <div className="p-3">
                <h3 className="font-medium text-sm truncate">
                  {entry.alcohols?.name || "名称未設定"}
                </h3>
                <p className="text-xs text-foreground/60 truncate">
                  {entry.alcohols?.type}
                  {entry.alcohols?.subtype && ` / ${entry.alcohols.subtype}`}
                </p>
                {entry.rating && (
                  <div className="mt-1 text-xs">
                    {"★".repeat(entry.rating)}
                    {"☆".repeat(5 - entry.rating)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-6xl mb-4">🍾</span>
          <h2 className="text-lg font-medium mb-2">まだお酒がありません</h2>
          <p className="text-sm text-foreground/60">
            下の「追加」ボタンから
            <br />
            お酒を登録しましょう
          </p>
        </div>
      )}
    </div>
  );
}
