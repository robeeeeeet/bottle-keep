"use client";

import { useEffect } from "react";
import Link from "next/link";

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

  return (
    <div className="px-4 pt-4">
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-6xl mb-4">🍺</span>
        <h2 className="text-lg font-medium mb-2">
          データの読み込みに失敗しました
        </h2>
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
          <Link
            href="/shelf"
            className="px-5 py-3 bg-foreground/10 rounded-xl font-medium hover:bg-foreground/20 transition-colors"
          >
            棚に戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
