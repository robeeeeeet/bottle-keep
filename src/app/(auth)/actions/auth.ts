"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// 認証系Server Actionの戻り値（成功時はredirectするため省略あり）。
// フィールドは全てオプショナルで、呼び出し側が result?.error のように参照する。
type AuthActionResult = {
  error?: string;
  success?: boolean;
  email?: string;
  emailConfirmationRequired?: boolean;
  existingUser?: boolean;
};

// 許可されたリダイレクト先のパスプレフィックス
const ALLOWED_REDIRECT_PREFIXES = ["/shelf", "/shared", "/add"];

// 入力値の制限（Supabaseの設定に合わせる）
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 72; // bcryptの上限
const MAX_DISPLAY_NAME_LENGTH = 50;

/**
 * リダイレクト先を検証し、安全なパスのみを許可する
 * Open Redirect脆弱性を防ぐため、内部パスのみ許可
 */
function getSafeRedirectPath(redirectTo: string | null): string {
  if (!redirectTo) return "/shelf";

  // 相対パスのみ許可（絶対URLや//で始まるプロトコル相対URLを拒否）
  if (redirectTo.startsWith("http://") || redirectTo.startsWith("https://") || redirectTo.startsWith("//")) {
    return "/shelf";
  }

  // 許可されたプレフィックスで始まるパスのみ許可
  const isAllowed = ALLOWED_REDIRECT_PREFIXES.some(prefix => redirectTo.startsWith(prefix));
  return isAllowed ? redirectTo : "/shelf";
}

/** FormDataから文字列フィールドを取得する（ファイル等はnull扱い） */
function getField(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === "string" ? value : null;
}

/** 制御文字を除去する */
function stripControlChars(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, "");
}

type Validated = { value: string } | { error: string };

function validateEmail(value: string | null): Validated {
  if (value === null) {
    return { error: "メールアドレスを入力してください" };
  }

  const email = stripControlChars(value).trim();

  if (!email) {
    return { error: "メールアドレスを入力してください" };
  }
  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_REGEX.test(email)) {
    return { error: "メールアドレスの形式が正しくありません" };
  }

  return { value: email };
}

function validatePassword(value: string | null): Validated {
  if (value === null || value.length === 0) {
    return { error: "パスワードを入力してください" };
  }
  if (value.length < MIN_PASSWORD_LENGTH) {
    return { error: `パスワードは${MIN_PASSWORD_LENGTH}文字以上で入力してください` };
  }
  if (value.length > MAX_PASSWORD_LENGTH) {
    return { error: `パスワードは${MAX_PASSWORD_LENGTH}文字以下で入力してください` };
  }

  return { value };
}

function validateDisplayName(value: string | null): Validated {
  if (value === null) {
    return { error: "表示名を入力してください" };
  }

  const displayName = stripControlChars(value).trim();

  if (!displayName) {
    return { error: "表示名を入力してください" };
  }
  if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    return { error: `表示名は${MAX_DISPLAY_NAME_LENGTH}文字以下で入力してください` };
  }

  return { value: displayName };
}

// Supabaseのエラーコード → ユーザー向け文言
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "メールアドレスまたはパスワードが正しくありません",
  email_not_confirmed:
    "メールアドレスの確認が完了していません。確認メールをご確認ください",
  email_address_invalid: "メールアドレスの形式が正しくありません",
  email_address_not_authorized: "このメールアドレスは使用できません",
  user_already_exists: "このメールアドレスは既に登録されています",
  weak_password: "パスワードが簡単すぎます。別のパスワードをお試しください",
  same_password: "現在のパスワードと同じパスワードは使用できません",
  over_email_send_rate_limit:
    "メール送信の回数制限に達しました。しばらく経ってからお試しください",
  over_request_rate_limit:
    "リクエストが多すぎます。しばらく経ってからお試しください",
  session_expired: "セッションの有効期限が切れました。もう一度お試しください",
  validation_failed: "入力内容を確認してください",
};

/**
 * Supabaseの生のエラーメッセージをそのまま返さず、定型文言にマッピングする
 * 未知のエラーはサーバーログにのみ詳細を残す
 */
function toUserMessage(error: AuthError, fallback: string): string {
  const mapped = error.code ? AUTH_ERROR_MESSAGES[error.code] : undefined;
  if (mapped) return mapped;

  console.error("[auth] unexpected error:", error.status, error.code, error.message);
  return fallback;
}

/**
 * メール内リンクに使うサイトURLを取得する
 *
 * 優先順位:
 *  1. NEXT_PUBLIC_SITE_URL（明示設定。独自ドメイン運用時はこれを使う）
 *  2. VERCEL_PROJECT_PRODUCTION_URL（Vercelが注入する本番ドメイン）
 *  3. 開発環境のみ localhost
 *
 * Hostヘッダ等のリクエスト由来の値は攻撃者が差し替えられるため使わない
 * （リセットリンクの改ざんに繋がる）。
 */
function getSiteUrl(): Validated {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return { value: configured.replace(/\/+$/, "") };
  }

  // Vercel上では環境変数が未設定でも本番ドメインが分かる
  const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProductionUrl) {
    return { value: `https://${vercelProductionUrl.replace(/\/+$/, "")}` };
  }

  if (process.env.NODE_ENV === "production") {
    console.error(
      "[auth] NEXT_PUBLIC_SITE_URL / VERCEL_PROJECT_PRODUCTION_URL is not configured"
    );
    return {
      error:
        "サーバー設定の不備によりメールを送信できませんでした。管理者にお問い合わせください",
    };
  }

  // 開発環境のみのフォールバック
  return { value: "http://localhost:3000" };
}

export async function login(formData: FormData): Promise<AuthActionResult | void> {
  const emailResult = validateEmail(getField(formData, "email"));
  if ("error" in emailResult) return emailResult;

  const passwordResult = validatePassword(getField(formData, "password"));
  if ("error" in passwordResult) return passwordResult;

  const redirectTo = getSafeRedirectPath(getField(formData, "redirectTo"));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: emailResult.value,
    password: passwordResult.value,
  });

  if (error) {
    return { error: toUserMessage(error, "ログインに失敗しました") };
  }

  revalidatePath("/", "layout");
  redirect(redirectTo);
}

export async function signup(formData: FormData): Promise<AuthActionResult | void> {
  const emailResult = validateEmail(getField(formData, "email"));
  if ("error" in emailResult) return emailResult;

  const passwordResult = validatePassword(getField(formData, "password"));
  if ("error" in passwordResult) return passwordResult;

  const displayNameResult = validateDisplayName(getField(formData, "displayName"));
  if ("error" in displayNameResult) return displayNameResult;

  const email = emailResult.value;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: passwordResult.value,
    options: {
      data: {
        display_name: displayNameResult.value,
      },
    },
  });

  if (error) {
    return { error: toUserMessage(error, "アカウント登録に失敗しました") };
  }

  // 既存のメールアドレスの場合（identitiesが空配列）
  // Supabaseはセキュリティ上、既存メールでもエラーを返さず偽のユーザーを返す
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return {
      error: "このメールアドレスは既に登録されています。確認メールをご確認いただくか、ログインをお試しください。",
      existingUser: true,
    };
  }

  // メール確認が必要な場合（sessionがnullでuserが存在）
  if (data.user && !data.session) {
    return { success: true, emailConfirmationRequired: true, email };
  }

  // メール確認不要の場合（開発環境など）
  const redirectTo = getSafeRedirectPath(getField(formData, "redirectTo"));
  revalidatePath("/", "layout");
  redirect(redirectTo);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function resetPassword(formData: FormData): Promise<AuthActionResult> {
  const emailResult = validateEmail(getField(formData, "email"));
  if ("error" in emailResult) return emailResult;

  // サイトURLを取得（本番では環境変数が必須）
  const siteUrlResult = getSiteUrl();
  if ("error" in siteUrlResult) return siteUrlResult;

  const email = emailResult.value;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrlResult.value}/auth/callback?type=recovery`,
  });

  if (error) {
    return { error: toUserMessage(error, "メールの送信に失敗しました") };
  }

  return { success: true, email };
}

export async function updatePassword(formData: FormData): Promise<AuthActionResult | void> {
  const passwordResult = validatePassword(getField(formData, "password"));
  if ("error" in passwordResult) return passwordResult;

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: passwordResult.value,
  });

  if (error) {
    return { error: toUserMessage(error, "パスワードの更新に失敗しました") };
  }

  revalidatePath("/", "layout");
  redirect("/shelf");
}
