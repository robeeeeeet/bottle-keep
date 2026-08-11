"use client";

import { useState, useEffect, useId } from "react";

// 現在のバージョン（更新時にここを変更）
const CURRENT_VERSION = "2026.08.11";

// 更新履歴の内容
const CHANGELOG = {
  version: CURRENT_VERSION,
  date: "2026年8月11日",
  title: "共有機能が新しくなりました",
  updates: [
    {
      icon: "🔗",
      title: "フォローで見られるように",
      description:
        "招待リンクやQRコードでフォローすると、その人の投稿が「フォロー中」タブに並びます。フォローされた側はワンタップでフォロー返しできます",
    },
    {
      icon: "❤️",
      title: "いいねとメモ",
      description:
        "気になる投稿にいいねすると「いいね」タブに集まります。自分だけに見えるメモも残せます",
    },
    {
      icon: "📊",
      title: "自分の投稿のいいね数",
      description:
        "「自分」タブで、それぞれの投稿がどれだけいいねされたか分かるようになりました",
    },
  ],
};

const STORAGE_KEY = "bottle-keep-changelog-version";

export function ChangelogModal() {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();

  const handleClose = () => {
    // バージョンを保存して閉じる
    localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    setIsOpen(false);
  };

  useEffect(() => {
    // localStorageから最後に見たバージョンを取得
    const lastSeenVersion = localStorage.getItem(STORAGE_KEY);

    // 初回訪問（キー未設定）の場合は現行バージョンをシードし、表示しない
    if (lastSeenVersion === null) {
      localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
      return;
    }

    // 現在のバージョンと異なる場合は表示
    if (lastSeenVersion !== CURRENT_VERSION) {
      setIsOpen(true);
    }
  }, []);

  // Escキーで閉じる & 表示中は背景スクロールをロック
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* モーダル */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative bg-background rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 fade-in duration-200"
      >
        {/* ヘッダー */}
        <div className="bg-gradient-to-br from-primary/20 to-gold/20 px-6 py-5 text-center border-b border-border">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-3">
            <span className="text-3xl">🎉</span>
          </div>
          <h2 id={titleId} className="text-xl font-bold text-foreground">
            {CHANGELOG.title}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            v{CHANGELOG.version} • {CHANGELOG.date}
          </p>
        </div>

        {/* 更新内容 */}
        <div className="px-6 py-4 max-h-[50vh] overflow-y-auto">
          <div className="space-y-4">
            {CHANGELOG.updates.map((update, index) => (
              <div
                key={index}
                className="flex gap-3 p-3 rounded-lg bg-muted/50"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">{update.icon}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">
                    {update.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {update.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* フッター */}
        <div className="px-6 py-4 border-t border-border">
          <button
            onClick={handleClose}
            className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            OK、使ってみる！
          </button>
        </div>
      </div>
    </div>
  );
}
