import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

// Supabase Storage のホスト名（画像最適化のremotePatterns等で使用）
const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "ceygoqxqwpcitjswwvlq.supabase.co";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  fallbacks: {
    // オフライン時のフォールバックページ
    document: "/offline",
  },
  runtimeCaching: [
    {
      // 静的アセット（JS, CSS, フォント）※自オリジンのみ（第三者ドメインを長期キャッシュしない）
      // 注: next-pwa/workboxはmatchCallback関数のurlPatternに対応しているが、
      // src/types/next-pwa.d.tsの型定義はRegExp|stringのみを許容するためキャストしている
      urlPattern: (({ url, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
        sameOrigin &&
        /\.(js|css|woff2?)$/i.test(url.pathname)) as unknown as RegExp,
      handler: "CacheFirst",
      options: {
        cacheName: "static-assets",
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30日
        },
      },
    },
    {
      // Supabase Storage の画像
      urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "supabase-images",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7日
        },
      },
    },
    {
      // Next.js の画像最適化（Workboxは完全URLで照合するため先頭アンカーは付けない）
      urlPattern: /\/_next\/image\?/i,
      handler: "CacheFirst",
      options: {
        cacheName: "next-images",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7日
        },
      },
    },
    // 注意: /rest/v1 (Supabase REST API) は認証済み個人データを含むため、
    // Cache Storageに残さないよう、あえてruntimeCachingルールを設けていない（NetworkOnly相当）
    {
      // Google Fonts
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts",
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1年
        },
      },
    },
  ],
});

const nextConfig: NextConfig = {
  // next-pwa が webpack 設定を注入するため、Turbopack 既定の Next 16 では
  // 空の turbopack 設定を明示してビルドエラーを抑止する（削除しないこと）
  turbopack: {},
  // 画像最適化の設定（Supabase Storage対応）
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHostname,
        pathname: "/storage/v1/object/public/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    // アプリ内で実際に使用されるサイズに合わせて調整
    deviceSizes: [375, 640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 192, 256, 384],
  },
  // セキュリティヘッダ
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
