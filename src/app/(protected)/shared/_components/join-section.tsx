"use client";

import { useState, useTransition } from "react";
import { joinByCode } from "../actions";

type JoinStep = "input" | "confirm" | "success";

export function JoinSection() {
  const [isPending, startTransition] = useTransition();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<JoinStep>("input");

  // コードを検証して確認画面へ
  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setError(null);
    setStep("confirm");
  };

  // 保持して参加
  const handleJoinKeep = () => {
    startTransition(async () => {
      const result = await joinByCode(code.trim(), { deleteCollection: false });
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

  // 削除して参加
  const handleJoinDelete = () => {
    startTransition(async () => {
      const result = await joinByCode(code.trim(), { deleteCollection: true });
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
                className="flex-1 px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
                disabled={isPending}
              />
              <button
                type="submit"
                disabled={isPending || !code.trim()}
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                参加
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-vermilion/10 border border-vermilion/20">
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
                {isPending && (
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
                    自分のコレクションを全て削除してからフレンドになる
                  </p>
                </div>
                {isPending && (
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
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 animate-in fade-in scale-in">
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
