"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updatePassword } from "../actions/auth";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    // セッションの確認（パスワードリセットリンクからのリダイレクト後）
    const checkSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setIsValidSession(true);
      } else {
        setIsValidSession(false);
      }
    };

    checkSession();
  }, []);

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

    const result = await updatePassword(formData);

    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
    }
    // 成功時はupdatePassword内でリダイレクトされる
  }

  // セッション確認中
  if (isValidSession === null) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-background">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="mt-4 text-sm text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  // 無効なセッション（リンク切れ等）
  if (isValidSession === false) {
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

        <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-sm animate-in fade-in">
          {/* エラーアイコン */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-vermilion/10 flex items-center justify-center border-2 border-vermilion/30">
              <svg
                className="w-10 h-10 text-vermilion"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>

          <h1 className="text-center text-2xl font-bold text-primary tracking-wider">
            リンクが無効です
          </h1>

          <div className="mt-6 p-4 rounded-lg bg-muted border border-border">
            <p className="text-sm text-muted-foreground text-center leading-relaxed">
              パスワード再設定のリンクが無効か、
              <br />
              有効期限が切れています。
            </p>
            <p className="mt-3 text-sm text-muted-foreground text-center leading-relaxed">
              お手数ですが、再度パスワード再設定を
              <br />
              リクエストしてください。
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/forgot-password"
              className="w-full rounded-lg btn-primary-gradient px-4 py-3.5 text-sm font-bold text-primary-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all active:scale-[0.98]"
            >
              再設定メールを再送信
            </Link>
            <Link
              href="/login"
              className="text-center text-sm text-accent hover:text-accent-light transition-colors underline underline-offset-2"
            >
              ログイン画面に戻る
            </Link>
          </div>
        </div>

        {/* フッター */}
        <div className="relative z-10 mt-8 text-center">
          <p className="text-xs text-muted-foreground/50">© 2025 Bottle Keep</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12 bg-background relative overflow-hidden">
      {/* 全画面ローディングオーバーレイ */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-foreground font-medium">パスワードを更新中...</p>
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

      {/* タイトルエリア */}
      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-sm animate-in fade-in">
        {/* ロゴ */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg">
            <span className="text-3xl">🔐</span>
          </div>
        </div>

        <h1 className="text-center text-2xl font-bold text-primary tracking-wider">
          新しいパスワードを設定
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          安全なパスワードを入力してください
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
              htmlFor="password"
              className="block text-sm font-medium text-foreground mb-2"
            >
              新しいパスワード
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
              新しいパスワード（確認）
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
                  更新中...
                </span>
              ) : (
                "パスワードを更新"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* フッター */}
      <div className="relative z-10 mt-8 text-center">
        <p className="text-xs text-muted-foreground/50">© 2025 Bottle Keep</p>
      </div>
    </div>
  );
}
