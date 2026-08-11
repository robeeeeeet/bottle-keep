import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { EditForm } from "../components/edit-form";
import type { CollectionEntryWithAlcohol } from "@/types/db";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  // 現在のユーザーをJWTからローカル取得（Authサーバーへの往復なし）
  const { data: claimsData } = await supabase.auth.getClaims();
  const currentUserId = claimsData?.claims.sub;

  // 未認証時はログインへ
  if (!currentUserId) {
    redirect("/login");
  }

  // コレクションエントリを取得（alcohols を JOIN）
  // 自分のエントリのみ編集可能（共有された他人のエントリは編集不可）
  const { data: entry, error } = await supabase
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
        brand,
        producer,
        origin_country,
        origin_region,
        alcohol_percentage,
        characteristics
      )
    `
    )
    .eq("id", id)
    .eq("user_id", currentUserId)
    .maybeSingle();

  if (error || !entry) {
    notFound();
  }

  // Supabaseの返り値を型安全に変換
  // Note: .single()を使用しているため、alcoholsは単一オブジェクトとして返される
  const typedEntry: CollectionEntryWithAlcohol = {
    id: entry.id,
    photo_url: entry.photo_url,
    drinking_date: entry.drinking_date,
    rating: entry.rating,
    memo: entry.memo,
    alcohols: entry.alcohols as unknown as CollectionEntryWithAlcohol["alcohols"],
  };

  return (
    <div className="min-h-screen relative">
      {/* ヘッダー */}
      <header className="header-japanese sticky top-0 z-40 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/shelf"
              className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
            >
              <svg
                className="w-5 h-5"
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
              <span className="text-sm">棚に戻る</span>
            </Link>
          </div>
          <h1 className="text-lg font-bold text-primary">編集</h1>
          <div className="w-20" /> {/* バランス用スペーサー */}
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="px-4 pt-4 pb-24">
        <EditForm entry={typedEntry} />
      </main>
    </div>
  );
}
