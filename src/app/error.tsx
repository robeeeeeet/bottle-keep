"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // エラーをログに記録（本番環境では外部サービスに送信）
    console.error("App Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <span className="text-6xl mb-4 block">😵</span>
        <h2 className="text-xl font-bold mb-2">エラーが発生しました</h2>
        <p className="text-sm text-foreground/60 mb-6">
          申し訳ございません。予期せぬエラーが発生しました。
          <br />
          もう一度お試しください。
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity"
        >
          もう一度試す
        </button>
      </div>
    </div>
  );
}
