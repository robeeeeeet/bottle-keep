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
    { media: "(prefers-color-scheme: dark)", color: "#2a1810" },
  ],
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
      </head>
      <body
        className={`${notoSerifJP.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
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
