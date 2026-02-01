"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// 許可されたリダイレクト先のパスプレフィックス
const ALLOWED_REDIRECT_PREFIXES = ["/shelf", "/shared", "/add"];

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

export async function login(formData: FormData) {
  const supabase = await createClient();

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };
  const redirectTo = getSafeRedirectPath(formData.get("redirectTo") as string);

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect(redirectTo);
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const displayName = formData.get("displayName") as string;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  });

  if (error) {
    return { error: error.message };
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
  const redirectTo = getSafeRedirectPath(formData.get("redirectTo") as string);
  revalidatePath("/", "layout");
  redirect(redirectTo);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;

  // サイトURLを取得（環境変数またはデフォルト）
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?type=recovery`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true, email };
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/shelf");
}
