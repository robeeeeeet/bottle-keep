import type { Metadata, Viewport } from "next";
import { Noto_Serif_JP, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { OfflineIndicator } from "@/components/pwa/offline-indicator";
import { NavigationProgress } from "@/components/layout/navigation-progress";
import { ThemeProvider } from "@/components/providers/theme-provider";

const notoSerifJP = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
    // globals.css のダークテーマ背景と一致させる
    { media: "(prefers-color-scheme: dark)", color: "#0f1419" },
  ],
};

/**
 * iOS の起動画面（apple-touch-startup-image）。
 * 未設定だとPWA起動時に真っ暗な画面が出るため、端末ごとの解像度に
 * 完全一致する画像を指定する（サイズが合わないとiOSは無視する）。
 * 画像は `npm run splash` で生成（scripts/generate-splash.mjs）。
 */
const APPLE_SPLASH_DEVICES = [
  { w: 375, h: 667, dpr: 2 },
  { w: 414, h: 736, dpr: 3 },
  { w: 375, h: 812, dpr: 3 },
  { w: 414, h: 896, dpr: 2 },
  { w: 414, h: 896, dpr: 3 },
  { w: 360, h: 780, dpr: 3 },
  { w: 390, h: 844, dpr: 3 },
  { w: 428, h: 926, dpr: 3 },
  { w: 393, h: 852, dpr: 3 },
  { w: 430, h: 932, dpr: 3 },
  { w: 402, h: 874, dpr: 3 },
  { w: 440, h: 956, dpr: 3 },
  { w: 744, h: 1133, dpr: 2 },
  { w: 768, h: 1024, dpr: 2 },
  { w: 820, h: 1180, dpr: 2 },
  { w: 834, h: 1194, dpr: 2 },
  { w: 1024, h: 1366, dpr: 2 },
] as const;

// standalone（ホーム画面から起動）を初回描画前に判定するためのスクリプト。
// CSSだけでも display-mode で判定できるが、古いiOSは navigator.standalone のみ
// 対応しているため両方を見る。
const STANDALONE_DETECT_SCRIPT = `(function(){try{var m=window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches;var s=window.navigator.standalone===true;if(m||s){document.documentElement.setAttribute('data-standalone','true');}}catch(e){}})();`;

export const metadata: Metadata = {
  title: "Bottle Keep",
  description: "お酒のコレクションを管理するアプリ",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Bottle Keep",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
    : undefined;

  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        {/* Supabase への事前接続（画像読み込み高速化） */}
        {supabaseOrigin && (
          <>
            <link rel="preconnect" href={supabaseOrigin} />
            <link rel="dns-prefetch" href={supabaseOrigin} />
          </>
        )}

        {/* iOS PWAの起動画面（未指定だと黒画面になる） */}
        {APPLE_SPLASH_DEVICES.map(({ w, h, dpr }) => (
          <link
            key={`${w}x${h}@${dpr}`}
            rel="apple-touch-startup-image"
            media={`screen and (device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`}
            href={`/splash/splash-${w * dpr}x${h * dpr}.png`}
          />
        ))}

        {/* 起動スプラッシュの表示判定（初回描画前に実行する必要があるため同期script） */}
        <script dangerouslySetInnerHTML={{ __html: STANDALONE_DETECT_SCRIPT }} />
      </head>
      <body
        className={`${notoSerifJP.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {/*
          起動スプラッシュ。iOSの静止画（/splash/*.png）と同じ地色・同じロゴ配置から
          始まり、CSSアニメーションで開いて自動的に消える（globals.css）。
          standalone起動時のみ表示され、SPA遷移では再生されない。
        */}
        <div className="launch-splash" aria-hidden="true">
          <div className="launch-splash__seal">酒</div>
          <div className="launch-splash__title">Bottle Keep</div>
          <div className="launch-splash__rule">
            <span />
            <span />
            <span />
          </div>
        </div>

        <ThemeProvider>
          <Suspense fallback={null}>
            <NavigationProgress />
          </Suspense>
          <OfflineIndicator />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
