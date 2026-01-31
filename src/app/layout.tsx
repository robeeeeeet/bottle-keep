import type { Metadata, Viewport } from "next";
import { Noto_Serif_JP, Geist_Mono } from "next/font/google";
import "./globals.css";
import { OfflineIndicator } from "@/components/pwa/offline-indicator";

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
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#2a1810", // 木目の暗い色
};

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
  return (
    <html lang="ja">
      <head>
        {/* Supabase への事前接続（画像読み込み高速化） */}
        <link rel="preconnect" href="https://ceygoqxqwpcitjswwvlq.supabase.co" />
        <link rel="dns-prefetch" href="https://ceygoqxqwpcitjswwvlq.supabase.co" />
      </head>
      <body
        className={`${notoSerifJP.variable} ${geistMono.variable} antialiased`}
      >
        <OfflineIndicator />
        {children}
      </body>
    </html>
  );
}
