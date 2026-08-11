"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createInviteLink, regenerateInviteLink } from "../actions";

// コピー完了の表示を戻すまでの時間
const COPIED_RESET_MS = 2200;

type Props = {
  /** 自分の有効な招待コード（未作成ならnull） */
  code: string | null;
  /** 招待リンクの完全なURL（サーバー側で組み立て済み） */
  inviteUrl: string | null;
  /** サーバー側で生成済みのQRコードSVG文字列 */
  qrSvg: string | null;
  /** サイトURLが未設定でリンクを組み立てられなかった場合 */
  siteUrlMissing: boolean;
};

/** どのボタンでスピナーを出すかを区別する（複数ボタンで状態を共有しない） */
type PendingAction = "create" | "regenerate" | null;

export function InviteLinkSection({
  code,
  inviteUrl,
  qrSvg,
  siteUrlMissing,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // コピー直後だけボタンの見た目を変えて、確かにコピーできたことを伝える
  const [justCopied, setJustCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 表示を戻すタイマーは離脱時に片付ける
  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const markCopied = () => {
    setNotice("リンクをコピーしました");
    setJustCopied(true);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => {
      setJustCopied(false);
      setNotice(null);
    }, COPIED_RESET_MS);
  };

  const runAction = (
    action: PendingAction,
    fn: () => Promise<{ code: string } | { error: string }>
  ) => {
    setError(null);
    setNotice(null);
    setPendingAction(action);
    startTransition(async () => {
      const result = await fn();
      setPendingAction(null);
      if ("error" in result) {
        setError(result.error);
      }
    });
  };

  const handleCreate = () => {
    if (isPending) return;
    runAction("create", createInviteLink);
  };

  const handleRegenerate = () => {
    if (isPending) return;
    const confirmed = window.confirm(
      "招待リンクを再発行します。\n\n" +
        "・現在のリンク／QRコードは無効になります\n" +
        "・既に配布したリンクからはフォローできなくなります\n" +
        "・すでにフォローしてくれた人との関係はそのまま残ります\n\n" +
        "再発行しますか？"
    );
    if (!confirmed) return;
    runAction("regenerate", regenerateInviteLink);
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    setError(null);
    try {
      await navigator.clipboard.writeText(inviteUrl);
      markCopied();
      return;
    } catch {
      // Clipboard API非対応時のフォールバック（非推奨メソッド使用）
      console.warn(
        "Clipboard API not available, using deprecated execCommand fallback"
      );
    }

    try {
      const textArea = document.createElement("textarea");
      textArea.value = inviteUrl;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      markCopied();
    } catch (fallbackError) {
      console.error("Copy failed:", fallbackError);
      setError("コピーに失敗しました");
    }
  };

  const handleShare = async () => {
    if (!inviteUrl) return;
    setError(null);
    if (typeof navigator.share !== "function") {
      // 共有APIが無い環境ではコピーで代替する
      await handleCopy();
      return;
    }
    try {
      await navigator.share({
        title: "Bottle Keep",
        text: "私のお酒コレクションをフォローしませんか？",
        url: inviteUrl,
      });
    } catch (shareError) {
      // ユーザーがキャンセルした場合もrejectされるためエラー表示はしない
      if (
        shareError instanceof DOMException &&
        shareError.name === "AbortError"
      ) {
        return;
      }
      console.warn("Share failed:", shareError);
      setError("共有できませんでした");
    }
  };

  return (
    <section>
      <h2 className="text-lg font-bold text-foreground mb-4">私の招待リンク</h2>

      {error && (
        <div
          role="alert"
          className="mb-4 p-3 rounded-lg bg-vermilion/10 border border-vermilion/20"
        >
          <p className="text-sm text-vermilion">{error}</p>
        </div>
      )}

      {/* 読み上げ用（内容は下のトーストと同じ） */}
      <p aria-live="polite" className="sr-only">
        {notice ?? ""}
      </p>

      {/*
        コピー完了のトースト。ボタンの文字が変わるだけでは気づきにくいため出す。
        画面下部はナビ・インストールバナー・オフライン表示で混雑しているため、
        重なりを避けて上部（セーフエリアの下）に表示する。
      */}
      {notice && (
        <div className="fixed left-4 right-4 top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 flex justify-center pointer-events-none">
          <p className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-lg animate-in fade-in slide-in-from-top-4">
            <svg
              className="w-4 h-4 text-gold"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            {notice}
          </p>
        </div>
      )}

      {siteUrlMissing && (
        <div
          role="alert"
          className="mb-4 p-3 rounded-lg bg-vermilion/10 border border-vermilion/20"
        >
          <p className="text-sm text-vermilion">
            サイトURLが設定されていないため招待リンクを作成できません。管理者にお問い合わせください。
          </p>
        </div>
      )}

      {code ? (
        <div className="card-tatami p-4 pt-5">
          {/* QRコード（ダークテーマでも読み取れるよう必ず白背景の枠に置く） */}
          {qrSvg && (
            <div className="flex justify-center mb-4">
              <div
                className="bg-white p-3 rounded-xl border border-border shadow-sm [&>svg]:block [&>svg]:w-[200px] [&>svg]:h-[200px]"
                role="img"
                aria-label="招待リンクのQRコード"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            </div>
          )}

          <p className="text-sm text-muted-foreground text-center mb-2">
            このQRコードかリンクを相手に見せると、相手があなたをフォローできます。
          </p>

          {inviteUrl && (
            <p className="font-mono text-xs text-foreground bg-background/60 rounded-lg px-3 py-2 mb-2 break-all text-center">
              {inviteUrl}
            </p>
          )}

          <p className="text-xs text-muted-foreground text-center mb-4">
            招待コード:{" "}
            <span className="font-mono text-foreground tracking-widest">
              {code}
            </span>
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={isPending || !inviteUrl}
              className={`
                flex-1 flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl
                font-semibold text-sm disabled:opacity-50 transition-colors
                ${
                  justCopied
                    ? "bg-gold text-primary-dark"
                    : "btn-primary-gradient text-primary-foreground"
                }
              `}
            >
              {justCopied ? (
                <>
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  コピーしました
                </>
              ) : (
                <>
                  <span aria-hidden="true">📋</span>
                  コピー
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleShare}
              disabled={isPending || !inviteUrl}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl bg-primary/10 text-primary font-semibold text-sm hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              <span aria-hidden="true">📤</span>
              共有
            </button>
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={isPending}
              aria-label="招待リンクを再発行（現在のリンクは無効になります）"
              title="招待リンクを再発行（現在のリンクは無効になります）"
              className="px-4 py-3 rounded-xl bg-muted text-muted-foreground font-semibold text-sm hover:bg-muted/80 transition-colors disabled:opacity-50"
            >
              {pendingAction === "regenerate" ? (
                <span className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin inline-block" />
              ) : (
                <span aria-hidden="true">🔄</span>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-muted/50 border border-border text-center">
          <div className="text-4xl mb-3" aria-hidden="true">
            🔗
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            招待リンクを作成すると、QRコードで相手にフォローしてもらえます。
          </p>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isPending || siteUrlMissing}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl btn-primary-gradient text-primary-foreground font-semibold text-sm disabled:opacity-50"
          >
            {pendingAction === "create" ? (
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <span aria-hidden="true">＋</span>
            )}
            招待リンクを作成
          </button>
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        フォローは一方通行です。相手があなたをフォローしても、あなたの棚が相手に見えるだけで、相手の棚は見えません。
        <br />
        同じリンクは何人にでも使えます。
      </p>
    </section>
  );
}
