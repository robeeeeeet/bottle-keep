import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4">
      <div role="alert" className="text-center max-w-sm">
        <span className="text-6xl mb-4 block" aria-hidden="true">
          🔍
        </span>
        <h1 className="text-xl font-bold mb-2">ページが見つかりません</h1>
        <p className="text-sm text-foreground/60 mb-6">
          お探しのページは存在しないか、
          <br />
          移動した可能性があります。
        </p>
        <Link
          href="/shelf"
          className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity"
        >
          棚に戻る
        </Link>
      </div>
    </div>
  );
}
