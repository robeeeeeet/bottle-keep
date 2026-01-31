"use client";

import { useState } from "react";
import Link from "next/link";
import { signup } from "../actions/auth";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);

    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("パスワードは6文字以上で入力してください");
      setIsLoading(false);
      return;
    }

    const result = await signup(formData);

    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12 bg-background relative overflow-hidden">
      {/* 青海波パターン背景 */}
      <div className="pattern-seigaiha" />

      {/* 装飾：左下の円弧 */}
      <div className="absolute -bottom-32 -left-32 w-64 h-64 border border-primary/10 rounded-full" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 border border-primary/5 rounded-full" />

      {/* 装飾：右上の円弧 */}
      <div className="absolute -top-32 -right-32 w-64 h-64 border border-gold/10 rounded-full" />
      <div className="absolute -top-24 -right-24 w-48 h-48 border border-gold/5 rounded-full" />

      {/* タイトルエリア */}
      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-sm animate-in fade-in">
        {/* ロゴ */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg">
            <span className="text-3xl">🍶</span>
          </div>
        </div>

        <h1 className="text-center text-2xl font-bold text-primary tracking-wider">
          アカウント作成
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Bottle Keepへようこそ
        </p>

        {/* 金色の装飾ライン */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <div className="h-px w-8 bg-gradient-to-r from-transparent to-gold/50" />
          <span className="text-gold text-xs">◆</span>
          <div className="h-px w-8 bg-gradient-to-l from-transparent to-gold/50" />
        </div>
      </div>

      {/* フォームエリア */}
      <div className="relative z-10 mt-8 sm:mx-auto sm:w-full sm:max-w-sm animate-in fade-in stagger-2">
        <form action={handleSubmit} className="space-y-4">
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
              htmlFor="displayName"
              className="block text-sm font-medium text-foreground mb-2"
            >
              表示名
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              autoComplete="name"
              required
              className="input-japanese w-full"
              placeholder="あなたの名前"
            />
          </div>

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
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground mb-2"
            >
              パスワード
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              className="input-japanese w-full"
              placeholder="6文字以上"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              6文字以上で入力してください
            </p>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-foreground mb-2"
            >
              パスワード（確認）
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              className="input-japanese w-full"
              placeholder="もう一度入力"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg btn-primary-gradient px-4 py-3.5 text-sm font-bold text-primary-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  登録中...
                </span>
              ) : (
                "アカウント作成"
              )}
            </button>
          </div>
        </form>

        {/* ログインリンク */}
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
            すでにアカウントをお持ちの方は{" "}
            <Link
              href="/login"
              className="font-bold text-accent hover:text-accent-light transition-colors underline underline-offset-2"
            >
              ログイン
            </Link>
          </p>
        </div>
      </div>

      {/* フッター */}
      <div className="relative z-10 mt-8 text-center">
        <p className="text-xs text-muted-foreground/50">© 2025 Bottle Keep</p>
      </div>
    </div>
  );
}
