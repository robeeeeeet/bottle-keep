import QRCode from "qrcode";
import { getFollowData } from "./actions";
import { InviteLinkSection } from "./_components/invite-link-section";
import { QrScanSection } from "./_components/qr-scan-section";
import { FollowingSection } from "./_components/following-section";
import { FollowersSection } from "./_components/followers-section";

/**
 * 招待リンクに使うサイトURLを解決する。
 *
 * 優先順位:
 *  1. NEXT_PUBLIC_SITE_URL（明示設定）
 *  2. VERCEL_PROJECT_PRODUCTION_URL（Vercelが注入する本番ドメイン）
 *  3. 開発環境のみ localhost
 *
 * Hostヘッダ等のリクエスト由来の値は差し替え可能なため使わない。
 */
function getSiteUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProductionUrl) {
    return `https://${vercelProductionUrl.replace(/\/+$/, "")}`;
  }

  if (process.env.NODE_ENV === "production") {
    console.error(
      "[shared] NEXT_PUBLIC_SITE_URL / VERCEL_PROJECT_PRODUCTION_URL is not configured"
    );
    return null;
  }

  return "http://localhost:3000";
}

/** 招待リンクのQRコードをサーバー側でSVG文字列として生成する（クライアントJS不要） */
async function buildQrSvg(url: string): Promise<string | null> {
  try {
    return await QRCode.toString(url, {
      type: "svg",
      margin: 1,
      width: 220,
      color: {
        // 前景はアプリのprimary（藍）。背景は白固定にして読み取りコントラストを確保する
        dark: "#1e4d78ff",
        light: "#ffffffff",
      },
    });
  } catch (error) {
    console.error("Failed to generate QR code:", error);
    return null;
  }
}

export default async function SharedPage() {
  const { inviteCode, following, followers } = await getFollowData();

  const siteUrl = getSiteUrl();
  const inviteUrl = inviteCode && siteUrl ? `${siteUrl}/invite/${inviteCode}` : null;
  const qrSvg = inviteUrl ? await buildQrSvg(inviteUrl) : null;

  return (
    <div className="min-h-screen bg-background">
      {/*
        ヘッダーは他ページと同じ .header-japanese を使う。
        独自スタイルだと padding-top: env(safe-area-inset-top) が無く、
        iOSのステータスバー（時計等）と重なってしまうため。
      */}
      <header className="header-japanese sticky top-0 z-40 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
            <span className="text-primary text-lg" aria-hidden="true">
              縁
            </span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary tracking-wide">
              つながり
            </h1>
            <p className="text-xs text-muted-foreground">
              招待リンクでフォローしあう
            </p>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 space-y-8 pb-24">
        {/* 自分の招待リンク（QR付き） */}
        <InviteLinkSection
          code={inviteCode}
          inviteUrl={inviteUrl}
          qrSvg={qrSvg}
          siteUrlMissing={siteUrl === null}
        />

        {/* QRを読み取ってフォロー */}
        <QrScanSection />

        {/* フォロー中 */}
        <FollowingSection users={following} />

        {/* フォロワー */}
        <FollowersSection users={followers} />
      </main>
    </div>
  );
}
