import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { peekInvite } from "../../shared/actions";
import { InviteAcceptForm } from "../../shared/_components/invite-accept-form";
import { acceptInvite } from "./actions";

type Props = {
  params: Promise<{ code: string }>;
};

/** 状態表示用のカード */
function StatusCard({
  emoji,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  emoji: string;
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="space-y-4 text-center">
      <div className="text-5xl" aria-hidden="true">
        {emoji}
      </div>
      <p className="text-lg font-bold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
      <Link
        href={actionHref}
        className="block w-full text-center px-4 py-3.5 rounded-xl btn-primary-gradient text-primary-foreground font-semibold"
      >
        {actionLabel}
      </Link>
    </div>
  );
}

export default async function InvitePage({ params }: Props) {
  const { code: rawCode } = await params;
  const code = decodeURIComponent(rawCode);

  // /invite はmiddlewareの保護対象に含まれていないため、ページ側で認証を確認する
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims.sub) {
    // NOTE: ログイン側の許可プレフィックスに /invite が無いため、
    // 現状はログイン後に /shelf へ着地する（招待リンクを再度開いてもらう必要がある）
    redirect(`/login?redirect=${encodeURIComponent(`/invite/${code}`)}`);
  }

  const peek = await peekInvite(code);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-xl shadow-sm">
            🤝
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">招待</h1>
            <p className="text-xs text-muted-foreground">
              招待リンクからフォロー
            </p>
          </div>
        </div>
      </header>

      <main className="px-4 py-8 pb-24">
        <div className="card-tatami p-6 pt-7">
          {peek.status === "ok" && (
            <InviteAcceptForm
              displayName={peek.displayName}
              onAccept={acceptInvite.bind(null, code)}
            />
          )}

          {peek.status === "already_following" && (
            <StatusCard
              emoji="✅"
              title="すでにフォローしています"
              description={`${
                peek.displayName || "このユーザー"
              }さんの投稿は「フォロー中」から見られます。`}
              actionHref="/shelf?tab=following"
              actionLabel="棚を見る"
            />
          )}

          {peek.status === "self" && (
            <StatusCard
              emoji="🪞"
              title="自分自身の招待リンクです"
              description="このリンクは他の人に共有してください。相手が開くとあなたをフォローできます。"
              actionHref="/shared"
              actionLabel="招待リンクを見る"
            />
          )}

          {(peek.status === "not_found" ||
            peek.status === "auth_required" ||
            peek.status === "error") && (
            <StatusCard
              emoji="⚠️"
              title="招待リンクが無効です"
              description="リンクが再発行された可能性があります。相手に新しい招待リンクを送ってもらってください。"
              actionHref="/shelf"
              actionLabel="棚に戻る"
            />
          )}
        </div>
      </main>
    </div>
  );
}
