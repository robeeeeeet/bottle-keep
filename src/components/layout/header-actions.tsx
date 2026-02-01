"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function HeaderActions() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // クライアントサイドでのみレンダリング（ハイドレーション問題回避）
  useEffect(() => {
    setMounted(true);
  }, []);

  // テーマ切り替え（ライト ↔ ダーク）
  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  // キャッシュをクリアしてリロード
  const clearCacheAndReload = async () => {
    try {
      // Service Worker のキャッシュをクリア
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
      // ページをハードリロード
      window.location.reload();
    } catch (error) {
      console.error("Cache clear failed:", error);
      window.location.reload();
    }
  };

  // マウント前はプレースホルダーを表示（レイアウトシフト防止）
  if (!mounted) {
    return (
      <div className="flex items-center gap-1">
        <div className="w-9 h-9" />
        <div className="w-9 h-9" />
      </div>
    );
  }

  // テーマアイコンの取得
  const getThemeIcon = () => {
    if (resolvedTheme === "dark") {
      return (
        // 月アイコン（現在ダーク → クリックでライトに）
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
          />
        </svg>
      );
    }
    return (
      // 太陽アイコン（現在ライト → クリックでダークに）
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
        />
      </svg>
    );
  };

  // テーマラベルの取得
  const getThemeLabel = () => {
    return resolvedTheme === "dark" ? "ダーク" : "ライト";
  };

  return (
    <div className="flex items-center gap-1">
      {/* テーマ切り替えボタン */}
      <button
        onClick={toggleTheme}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-2 rounded-lg hover:bg-muted"
        title={`テーマ: ${getThemeLabel()}`}
        aria-label={`テーマを切り替え（現在: ${getThemeLabel()}）`}
      >
        {getThemeIcon()}
      </button>

      {/* キャッシュクリア＆リロードボタン */}
      <button
        onClick={clearCacheAndReload}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-2 rounded-lg hover:bg-muted"
        title="キャッシュをクリアしてリロード"
        aria-label="キャッシュをクリアしてリロード"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
          />
        </svg>
      </button>
    </div>
  );
}
