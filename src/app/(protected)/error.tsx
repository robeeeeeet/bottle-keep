"use client";

import { useEffect } from "react";

export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Protected Area Error:", error);
  }, [error]);

  // 同一ルート（例: /shelf）でのエラー時、<Link href="/shelf">は
  // パスが変化しないため遷移が起きず無反応になる。
  // 確実に画面を復帰させるためハード遷移でフォールバックする。
  const handleBackToShelf = () => {
    window.location.assign("/shelf");
  };

  return (
    <div className="px-4 pt-4">
      <div role="alert" className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-6xl mb-4" aria-hidden="true">
          🍺
        </span>
        <h1 className="text-lg font-medium mb-2">
          データの読み込みに失敗しました
        </h1>
        <p className="text-sm text-foreground/60 mb-6">
          ネットワーク接続を確認して
          <br />
          もう一度お試しください
        </p>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="px-5 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            再読み込み
          </button>
          <button
            onClick={handleBackToShelf}
            className="px-5 py-3 bg-foreground/10 rounded-xl font-medium hover:bg-foreground/20 transition-colors"
          >
            棚に戻る
          </button>
        </div>
      </div>
    </div>
  );
}
