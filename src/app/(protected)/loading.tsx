export default function ProtectedLoading() {
  return (
    <div className="px-4 pt-4">
      {/* ヘッダースケルトン */}
      <header className="flex items-center justify-between mb-6">
        <div className="h-8 w-24 bg-foreground/10 rounded animate-pulse" />
        <div className="h-5 w-16 bg-foreground/10 rounded animate-pulse" />
      </header>

      {/* グリッドスケルトン */}
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-foreground/5 rounded-xl overflow-hidden animate-pulse"
          >
            <div className="aspect-square bg-foreground/10" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-foreground/10 rounded w-3/4" />
              <div className="h-3 bg-foreground/10 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
