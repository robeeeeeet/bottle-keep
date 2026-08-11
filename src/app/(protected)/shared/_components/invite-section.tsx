"use client";

import { useState, useTransition } from "react";
import { getOrCreateInvite, regenerateInvite, type ShelfShare } from "../actions";

type Props = {
  currentInvite: ShelfShare | null;
};

export function InviteSection({ currentInvite }: Props) {
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetOrCreateInvite = () => {
    setError(null);
    startTransition(async () => {
      const result = await getOrCreateInvite();
      if ("error" in result) {
        setError(result.error);
      }
    });
  };

  const handleRegenerateInvite = () => {
    if (isPending) return;
    // 再生成すると配布済みの旧コードが無効になるため確認する
    const confirmed = window.confirm(
      "新しい招待コードを生成します。\n\n" +
        "・現在のコードは無効になります\n" +
        "・既に共有した相手はそのコードで参加できなくなります\n\n" +
        "再生成しますか？"
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await regenerateInvite();
      if ("error" in result) {
        setError(result.error);
      }
    });
  };

  const handleCopyCode = async () => {
    if (!currentInvite?.invite_code) return;
    try {
      await navigator.clipboard.writeText(currentInvite.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API非対応時のフォールバック（非推奨メソッド使用）
      console.warn(
        "Clipboard API not available, using deprecated execCommand fallback"
      );
      try {
        const textArea = document.createElement("textarea");
        textArea.value = currentInvite.invite_code;
        // 画面外に配置
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackError) {
        console.error("Copy failed:", fallbackError);
        setError("コピーに失敗しました");
      }
    }
  };

  return (
    <section>
      <h2 className="text-lg font-bold text-foreground mb-4">招待コード</h2>

      {error && (
        <div
          role="alert"
          className="mb-4 p-3 rounded-lg bg-vermilion/10 border border-vermilion/20"
        >
          <p className="text-sm text-vermilion">{error}</p>
        </div>
      )}

      {currentInvite ? (
        // 招待コードがある場合
        <div className="p-4 rounded-2xl bg-card border border-border">
          <div className="text-center mb-4">
            <p className="text-sm text-muted-foreground mb-2">
              このコードをフレンドに送ってください
            </p>
            <div className="font-mono text-lg text-foreground bg-muted/50 rounded-lg px-4 py-2">
              {currentInvite.invite_code}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {/* ロケール依存の日付整形はサーバー/クライアントで差異が出るため警告を抑制 */}
              <span suppressHydrationWarning>
                {new Date(currentInvite.created_at).toLocaleDateString("ja-JP")}
              </span>
              に作成
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCopyCode}
              disabled={isPending}
              aria-live="polite"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {copied ? (
                <>
                  <span>✓</span>
                  コピー済み
                </>
              ) : (
                <>
                  <span>📋</span>
                  コードをコピー
                </>
              )}
            </button>
            <button
              onClick={handleRegenerateInvite}
              disabled={isPending}
              aria-label="招待コードを再生成（古いコードは無効になります）"
              className="px-4 py-3 rounded-xl bg-muted text-muted-foreground font-semibold text-sm hover:bg-muted/80 transition-colors disabled:opacity-50"
              title="新しいコードを生成（古いコードは無効になります）"
            >
              {isPending ? (
                <span className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin inline-block" />
              ) : (
                "🔄"
              )}
            </button>
          </div>
        </div>
      ) : (
        // 招待コードがない場合
        <div className="p-6 rounded-2xl bg-muted/50 border border-border text-center">
          <div className="text-4xl mb-3">🔗</div>
          <p className="text-sm text-muted-foreground mb-4">
            招待コードを作成して、フレンドと共有しましょう
          </p>
          <button
            onClick={handleGetOrCreateInvite}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {isPending ? (
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <span>+</span>
            )}
            招待コードを作成
          </button>
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        フレンドがコードを入力して参加すると、お互いの棚が見れるようになります。
        <br />
        ※ 1つのコードで招待できるのは1人までです。複数人を招待する場合は再生成してください。
      </p>
    </section>
  );
}
