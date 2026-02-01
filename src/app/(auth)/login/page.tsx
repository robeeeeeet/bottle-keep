"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { login } from "../actions/auth";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/shelf";

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);

    const result = await login(formData);

    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12 bg-background relative overflow-hidden">
      {/* 全画面ローディングオーバーレイ */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-foreground font-medium">ログイン中...</p>
          </div>
        </div>
      )}

      {/* 青海波パターン背景 */}
      <div className="pattern-seigaiha" />

      {/* 装飾：左下の円弧 */}
      <div className="absolute -bottom-32 -left-32 w-64 h-64 border border-primary/10 rounded-full" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 border border-primary/5 rounded-full" />

      {/* 装飾：右上の円弧 */}
      <div className="absolute -top-32 -right-32 w-64 h-64 border border-gold/10 rounded-full" />
      <div className="absolute -top-24 -right-24 w-48 h-48 border border-gold/5 rounded-full" />

      {/* ロゴ・タイトルエリア */}
      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-sm animate-in fade-in">
        {/* ロゴ */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg">
            <span className="text-4xl">🍶</span>
          </div>
        </div>

        <h1 className="text-center text-3xl font-bold text-primary tracking-wider">
          Bottle Keep
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          お酒のコレクションを管理
        </p>

        {/* 金色の装飾ライン */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-gold/50" />
          <span className="text-gold text-xs">◆</span>
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-gold/50" />
        </div>
      </div>

      {/* フォームエリア */}
      <div className="relative z-10 mt-10 sm:mx-auto sm:w-full sm:max-w-sm animate-in fade-in stagger-2">
        <form action={handleSubmit} className="space-y-5">
          <input type="hidden" name="redirectTo" value={redirectTo} />
          {error && (
            <div className="p-4 rounded-lg bg-vermilion/10 border border-vermilion/20 animate-in scale-in">
              <div className="flex items-center gap-2">
                <span className="text-vermilion">⚠</span>
                <p className="text-sm text-vermilion">{error}</p>
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground mb-2"
            >
              メールアドレス
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="input-japanese w-full"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-foreground"
              >
                パスワード
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-accent hover:text-accent-light transition-colors"
              >
                パスワードをお忘れの方
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="input-japanese w-full"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg btn-primary-gradient px-4 py-3.5 text-sm font-bold text-primary-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ログイン中...
              </span>
            ) : (
              "ログイン"
            )}
          </button>
        </form>

        {/* サインアップリンク */}
        <div className="mt-8 text-center">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-4 text-muted-foreground">
                または
              </span>
            </div>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            アカウントをお持ちでない方は{" "}
            <Link
              href={redirectTo !== "/shelf" ? `/signup?redirect=${encodeURIComponent(redirectTo)}` : "/signup"}
              className="font-bold text-accent hover:text-accent-light transition-colors underline underline-offset-2"
            >
              新規登録
            </Link>
          </p>
        </div>
      </div>

      {/* フッター */}
      <div className="relative z-10 mt-12 text-center">
        <p className="text-xs text-muted-foreground/50">
          © 2025 Bottle Keep
        </p>
      </div>
    </div>
  );
}

// ローディングフォールバック
function LoginFormFallback() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-6 py-12 bg-background">
      <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm />
    </Suspense>
  );
}
