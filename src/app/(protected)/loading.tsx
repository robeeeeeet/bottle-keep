export default function ProtectedLoading() {
  return (
    <div className="min-h-screen relative">
      {/* ヘッダースケルトン（実ヘッダーと同じ高さ・配置） */}
      <header className="header-japanese sticky top-0 z-40 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-foreground/10 animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-24 bg-foreground/10 rounded animate-pulse" />
              <div className="h-3 w-32 bg-foreground/10 rounded animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-foreground/10 animate-pulse" />
            <div className="w-8 h-8 rounded-lg bg-foreground/10 animate-pulse" />
          </div>
        </div>
      </header>

      {/* リスト型カードスケルトン（棚の実レイアウトに合わせる） */}
      <main className="px-4 pt-4 pb-24 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="card-tatami overflow-hidden"
            style={{ opacity: 1 - i * 0.15 }}
          >
            <div className="flex gap-3 p-3">
              <div className="w-20 h-20 rounded-lg bg-foreground/10 animate-pulse flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-2 py-1">
                <div className="h-4 bg-foreground/10 rounded w-3/4 animate-pulse" />
                <div className="h-3 bg-foreground/10 rounded w-1/2 animate-pulse" />
                <div className="h-3 bg-foreground/10 rounded w-1/3 animate-pulse" />
              </div>
            </div>
            <div className="border-t border-border px-3 py-2.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-foreground/10 animate-pulse" />
              <div className="h-3 bg-foreground/10 rounded w-1/3 animate-pulse" />
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
