"use client";

import { useState, useEffect, useMemo } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// ブラウザ環境かどうかをチェック
function getIsStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error - iOS Safari specific property
    window.navigator.standalone === true
  );
}

function getIsIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window)
  );
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  // 初期値はクライアントサイドで計算
  const isStandalone = useMemo(() => getIsStandalone(), []);
  const isIOS = useMemo(() => getIsIOS(), []);

  useEffect(() => {
    if (isStandalone) return;

    // 既に非表示設定されているかチェック
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const dismissedAt = new Date(dismissed);
      const daysSinceDismissed =
        (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60 * 24);
      // 7日以内に非表示にした場合は表示しない
      if (daysSinceDismissed < 7) return;
    }

    // Android/Desktop Chrome用
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // iOS用：少し遅延して表示
    if (isIOS) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener(
          "beforeinstallprompt",
          handleBeforeInstallPrompt
        );
      };
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, [isIOS, isStandalone]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", new Date().toISOString());
  };

  // 表示しない条件
  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="relative overflow-hidden rounded-xl shadow-lg">
        {/* 背景グラデーション */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary-dark" />

        {/* 市松模様の装飾（左上） */}
        <div className="absolute -top-4 -left-4 w-24 h-24 opacity-10">
          <div className="pattern-ichimatsu w-full h-full" />
        </div>

        {/* コンテンツ */}
        <div className="relative p-4">
          <div className="flex items-start gap-3">
            {/* アイコン */}
            <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">🍶</span>
            </div>

            {/* テキスト */}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-primary-foreground text-sm">
                アプリをインストール
              </h3>
              {isIOS ? (
                <p className="text-xs text-primary-foreground/70 mt-1 leading-relaxed">
                  <span className="inline-flex items-center gap-1 text-gold font-medium">
                    <ShareIcon className="w-3 h-3" />
                    共有
                  </span>
                  {" → "}
                  <span className="text-primary-foreground/90">
                    「ホーム画面に追加」
                  </span>
                  でアプリとして使えます
                </p>
              ) : (
                <p className="text-xs text-primary-foreground/70 mt-1">
                  ホーム画面に追加して、いつでもすぐアクセス
                </p>
              )}
            </div>

            {/* 閉じるボタン */}
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-lg text-primary-foreground/50 hover:text-primary-foreground hover:bg-white/10 transition-all"
              aria-label="閉じる"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          {/* インストールボタン（iOS以外） */}
          {!isIOS && deferredPrompt && (
            <button
              onClick={handleInstall}
              className="w-full mt-4 py-3 btn-gold rounded-lg font-bold text-sm transition-all active:scale-[0.98]"
            >
              インストール
            </button>
          )}
        </div>

        {/* 金色のトップライン */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent" />
      </div>
    </div>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0-12L8 8m4-4l4 4"
      />
    </svg>
  );
}
