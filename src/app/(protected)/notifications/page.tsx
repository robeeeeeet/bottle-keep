import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MarkSeen } from "./_components/mark-seen";

/**
 * いいね通知の一覧。
 *
 * 「誰がいいねしたか」は get_like_notifications() RPC から取得する。
 * post_likes のRLSは「自分の行のみ参照可」を維持しているため、
 * いいねした人の非公開メモ（note）はここには含まれない。
 */

// 相対時間の表示（例: 3分前 / 2時間前 / 3日前）
function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "たった今";
  if (minutes < 60) return `${minutes}分前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}日前`;

  return new Date(iso).toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
  });
}

function AlcoholIcon({ type }: { type: string | null }) {
  const iconMap: Record<string, string> = {
    日本酒: "🍶",
    ワイン: "🍷",
    ビール: "🍺",
    ウイスキー: "🥃",
    焼酎: "🫗",
  };
  return (
    <span className="text-2xl opacity-60" aria-hidden="true">
      {iconMap[type ?? ""] || "🍶"}
    </span>
  );
}

export default async function NotificationsPage() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const currentUserId = claimsData?.claims.sub;

  if (!currentUserId) {
    redirect("/login");
  }

  const { data, error } = await supabase.rpc("get_like_notifications", {
    max_rows: 50,
  });

  // 取得失敗を「通知なし」と誤認させない
  if (error) {
    throw error;
  }

  const notifications = data ?? [];
  const unreadCount = notifications.filter((n) => n.is_unread).length;

  return (
    <div className="min-h-screen relative">
      {/* ヘッダー */}
      <header className="header-japanese sticky top-0 z-40 px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/shelf"
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
          <div className="text-right">
            <h1 className="text-lg font-bold text-primary">お知らせ</h1>
            {unreadCount > 0 && (
              <p className="text-xs text-vermilion">新着{unreadCount}件</p>
            )}
          </div>
        </div>
      </header>

      <main className="px-4 pt-4 pb-24">
        {notifications.length > 0 ? (
          <>
            <div className="space-y-2">
              {notifications.map((n) => (
                <Link
                  key={`${n.entry_id}-${n.liker_id}`}
                  href={`/shelf/${n.entry_id}`}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border transition-colors
                    active:scale-[0.99]
                    ${
                      n.is_unread
                        ? "bg-vermilion/5 border-vermilion/20"
                        : "bg-muted/40 border-border-light"
                    }
                  `}
                >
                  {/* 未読の印 */}
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      n.is_unread ? "bg-vermilion" : "bg-transparent"
                    }`}
                    aria-hidden="true"
                  />

                  {/* いいねした人 */}
                  <span
                    className="w-9 h-9 rounded-full bg-accent/10 text-accent flex items-center justify-center text-sm flex-shrink-0"
                    aria-hidden="true"
                  >
                    👤
                  </span>

                  {/* 本文 */}
                  <span className="flex-1 min-w-0">
                    <span className="text-sm text-foreground block leading-snug">
                      <span className="font-medium text-accent">
                        {n.liker_name || "ユーザー"}
                      </span>
                      さんが
                      <span className="font-medium">
                        「{n.alcohol_name || "名称未設定"}」
                      </span>
                      にいいねしました
                    </span>
                    <span className="text-xs text-muted-foreground mt-0.5 block">
                      {formatRelativeTime(n.liked_at)}
                    </span>
                  </span>

                  {/* 対象の投稿の写真 */}
                  {n.entry_photo_url ? (
                    <span className="w-12 h-12 relative rounded-lg overflow-hidden flex-shrink-0 block">
                      <Image
                        src={n.entry_photo_url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </span>
                  ) : (
                    <span className="w-12 h-12 rounded-lg photo-placeholder flex-shrink-0 flex items-center justify-center">
                      <AlcoholIcon type={n.alcohol_type} />
                    </span>
                  )}
                </Link>
              ))}
            </div>

            <p className="mt-6 text-xs text-muted-foreground text-center">
              いいねしてくれた人には、あなたが見たことは通知されません。
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in">
            <div className="empty-state-icon mb-6">
              <svg
                className="w-16 h-16 text-primary/25"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-primary mb-2">
              まだお知らせはありません
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              あなたの投稿にいいねが付くと
              <br />
              ここでお知らせします
            </p>
          </div>
        )}
      </main>

      {/*
        このページを開いた時点で既読にする。
        描画後に実行されるので、上の「新着◯件」表示は今回の分まで見える。
      */}
      <MarkSeen hasUnread={unreadCount > 0} />
    </div>
  );
}
