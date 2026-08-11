"use client";

import { useEffect, useState } from "react";

// セッション中に自動リロードを試みたかどうかの記録キー
const AUTO_RELOAD_KEY = "bottle-keep-error-auto-reloaded";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isReloading, setIsReloading] = useState(false);

  useEffect(() => {
    // エラーをログに記録（本番環境では外部サービスに送信）
    console.error("App Error:", error);

    // アプリを更新した直後は、ホーム画面から復帰したPWAが古いページを
    // 保持したままになり、Server Actionが404になって操作できなくなる。
    // reset()は同じ古いコードを再描画するだけで復帰できないため、
    // セッション中1回だけハードリロードして新しいデプロイを取り直す。
    try {
      if (!sessionStorage.getItem(AUTO_RELOAD_KEY)) {
        sessionStorage.setItem(AUTO_RELOAD_KEY, "1");
        setIsReloading(true);
        window.location.reload();
      }
    } catch {
      // sessionStorageが使えない環境では手動リロードに任せる
    }
  }, [error]);

  const handleReload = () => {
    setIsReloading(true);
    window.location.reload();
  };

  // 自動リロード中は一瞬だけ表示されるため、エラーUIは出さない
  if (isReloading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center px-4">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4">
      <div role="alert" className="text-center max-w-sm">
        <span className="text-6xl mb-4 block" aria-hidden="true">
          😵
        </span>
        <h1 className="text-xl font-bold mb-2">エラーが発生しました</h1>
        <p className="text-sm text-foreground/60 mb-6">
          申し訳ございません。予期せぬエラーが発生しました。
          <br />
          再読み込みすると直ることがあります。
        </p>
        <div className="flex flex-col gap-3">
          {/* 新しいバージョンを取り直すため、ハードリロードを主動線にする */}
          <button
            onClick={handleReload}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            再読み込み
          </button>
          <button
            onClick={reset}
            className="px-6 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            もう一度試す
          </button>
        </div>
        {error.digest && (
          <p className="mt-6 text-xs text-muted-foreground/70">
            エラーID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
