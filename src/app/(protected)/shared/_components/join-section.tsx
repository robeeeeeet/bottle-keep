"use client";

import { useState, useTransition } from "react";
import { joinByCode, validateInviteCode } from "../actions";

type JoinStep = "input" | "confirm" | "success";
// どの操作が実行中かを保持し、押したボタンだけにスピナーを出す
type PendingAction = "validate" | "keep" | "delete" | null;

const INVITE_CODE_LENGTH = 8;
// generateInviteCode と同じ文字集合（紛らわしい I / O / l を除外）
const INVITE_CODE_PATTERN = /^[A-HJ-NP-Za-hjkmnp-z2-9]{8}$/;

export function JoinSection() {
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<JoinStep>("input");

  const trimmedCode = code.trim();

  // コードを検証して確認画面へ（不正なコードで破壊的フローに入らせない）
  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmedCode || isPending) return;

    // 1. 形式チェック（サーバー往復の前に弾く）
    if (trimmedCode.length !== INVITE_CODE_LENGTH) {
      setError(`招待コードは${INVITE_CODE_LENGTH}文字です`);
      return;
    }
    if (!INVITE_CODE_PATTERN.test(trimmedCode)) {
      setError("招待コードに使用できない文字が含まれています");
      return;
    }

    setError(null);
    setPendingAction("validate");
    startTransition(async () => {
      // 2. サーバー側で受諾可能か確認（レコードは変更しない）
      const result = await validateInviteCode(trimmedCode);
      setPendingAction(null);
      if ("error" in result) {
        setError(result.error);
        setStep("input");
        return;
      }
      setStep("confirm");
    });
  };

  const runJoin = (action: "keep" | "delete") => {
    setPendingAction(action);
    startTransition(async () => {
      const result = await joinByCode(trimmedCode, {
        deleteCollection: action === "delete",
      });
      setPendingAction(null);
      if ("error" in result) {
        setError(result.error);
        setStep("input");
      } else {
        setStep("success");
        setCode("");
        setTimeout(() => setStep("input"), 3000);
      }
    });
  };

  // 保持して参加
  const handleJoinKeep = () => {
    if (isPending) return;
    runJoin("keep");
  };

  // 削除して参加（不可逆なので二段確認）
  const handleJoinDelete = () => {
    if (isPending) return;
    const confirmed = window.confirm(
      "自分のコレクションを全て削除してフレンドになります。\n\n" +
        "・登録したお酒・写真・評価・メモが全て消えます\n" +
        "・この操作は取り消せません（元に戻せません）\n\n" +
        "本当に削除して参加しますか？"
    );
    if (!confirmed) return;
    runJoin("delete");
  };

  // キャンセル
  const handleCancel = () => {
    setStep("input");
    setError(null);
  };

  return (
    <section>
      <h2 className="text-lg font-bold text-foreground mb-4">
        招待コードで参加
      </h2>

      {/* ステップ1: コード入力 */}
      {step === "input" && (
        <>
          <form onSubmit={handleCodeSubmit} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="招待コードを入力"
                aria-label="招待コード"
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
                maxLength={INVITE_CODE_LENGTH}
                className="flex-1 px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
                disabled={isPending}
              />
              <button
                type="submit"
                disabled={isPending || !trimmedCode}
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {isPending && pendingAction === "validate" ? (
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin inline-block" />
                ) : (
                  "参加"
                )}
              </button>
            </div>

            {error && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-vermilion/10 border border-vermilion/20"
              >
                <p className="text-sm text-vermilion">{error}</p>
              </div>
            )}
          </form>

          <p className="mt-3 text-xs text-muted-foreground">
            フレンドから受け取った招待コードを入力してください
          </p>
        </>
      )}

      {/* ステップ2: 確認ダイアログ */}
      {step === "confirm" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="p-4 rounded-xl bg-gold/5 border border-gold/20">
            <div className="flex items-start gap-3">
              <span className="text-gold text-lg">🤝</span>
              <div>
                <p className="font-medium text-foreground">フレンドになりますか？</p>
                <p className="text-sm text-muted-foreground mt-1">
                  自分のコレクションをどうしますか？
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* 保持するボタン */}
            <button
              onClick={handleJoinKeep}
              disabled={isPending}
              className="w-full p-4 rounded-xl border border-primary/30 bg-primary/5 text-left hover:bg-primary/10 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-lg">📦</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">保持する</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    今のコレクションを残したままフレンドになる
                  </p>
                </div>
                {isPending && pendingAction === "keep" && (
                  <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                )}
              </div>
            </button>

            {/* 削除するボタン */}
            <button
              onClick={handleJoinDelete}
              disabled={isPending}
              className="w-full p-4 rounded-xl border border-vermilion/30 bg-vermilion/5 text-left hover:bg-vermilion/10 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-vermilion/10 flex items-center justify-center">
                  <span className="text-lg">🗑️</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">削除する</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    自分のコレクションを全て削除してからフレンドになる（取り消せません）
                  </p>
                </div>
                {isPending && pendingAction === "delete" && (
                  <span className="w-4 h-4 border-2 border-vermilion/30 border-t-vermilion rounded-full animate-spin" />
                )}
              </div>
            </button>
          </div>

          {/* キャンセルボタン */}
          <button
            onClick={handleCancel}
            disabled={isPending}
            className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            キャンセル
          </button>
        </div>
      )}

      {/* ステップ3: 成功 */}
      {step === "success" && (
        <div
          role="status"
          aria-live="polite"
          className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 animate-in fade-in scale-in"
        >
          <div className="flex items-center gap-3">
            <span className="text-green-500 text-lg">✓</span>
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
              フレンドになりました！
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
