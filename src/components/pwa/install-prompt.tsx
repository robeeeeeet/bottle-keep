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
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
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
      <div className="bg-primary text-primary-foreground rounded-lg p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <span className="text-3xl">🍶</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm">アプリをインストール</h3>
            {isIOS ? (
              <p className="text-xs opacity-80 mt-1">
                <span className="inline-flex items-center gap-1">
                  <ShareIcon className="w-3 h-3" />
                  共有
                </span>
                →「ホーム画面に追加」でアプリとして使えます
              </p>
            ) : (
              <p className="text-xs opacity-80 mt-1">
                ホーム画面に追加して、いつでもすぐアクセス
              </p>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 opacity-60 hover:opacity-100 transition-opacity"
            aria-label="閉じる"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {!isIOS && deferredPrompt && (
          <button
            onClick={handleInstall}
            className="w-full mt-3 py-2.5 bg-gold text-primary rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
          >
            インストール
          </button>
        )}
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
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l-1.41 1.41L15.17 8H4v2h11.17l-4.58 4.59L12 16l6-6-6-6z" />
      <path d="M4 18h16v2H4z" />
    </svg>
  );
}
