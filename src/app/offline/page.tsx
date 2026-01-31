"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <span className="text-6xl mb-4 block">📡</span>
        <h1 className="text-xl font-bold mb-2">オフラインです</h1>
        <p className="text-sm text-foreground/60 mb-6">
          インターネット接続がありません。
          <br />
          接続を確認してから再度お試しください。
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity"
        >
          再読み込み
        </button>
      </div>
    </div>
  );
}
