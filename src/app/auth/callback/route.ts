import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

// verifyOtpで扱えるメールリンクの種類
const EMAIL_OTP_TYPES: EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return value !== null && (EMAIL_OTP_TYPES as string[]).includes(value);
}

/**
 * next パラメータを検証し、内部パスのみ許可する
 * Open Redirect対策として "/" 始まり（かつプロトコル相対でない）のみ通す
 */
function getSafeNextPath(next: string | null): string | null {
  if (!next) return null;
  if (!next.startsWith("/")) return null;
  // "//example.com" や "/\example.com" はプロトコル相対URLとして扱われる
  if (next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = getSafeNextPath(requestUrl.searchParams.get("next"));
  const origin = requestUrl.origin;

  // メールリンク側でエラーになった場合（期限切れ・キャンセル等）
  const errorParam = requestUrl.searchParams.get("error");
  const errorCode = requestUrl.searchParams.get("error_code");
  const errorDescription = requestUrl.searchParams.get("error_description");

  if (errorParam || errorCode) {
    console.error("Auth callback error:", {
      error: errorParam,
      errorCode,
      errorDescription,
    });

    const reason =
      errorCode === "otp_expired"
        ? "expired_link"
        : errorParam === "access_denied"
          ? "access_denied"
          : "auth_error";

    return NextResponse.redirect(`${origin}/login?error=${reason}`);
  }

  // 成功後の遷移先（パスワードリセットは専用画面へ）
  const destination =
    type === "recovery" ? "/reset-password" : (next ?? "/shelf");

  // 新形式のメールリンク（token_hash + type）
  if (tokenHash && isEmailOtpType(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (error) {
      console.error("Auth callback verifyOtp error:", error);
      return NextResponse.redirect(`${origin}/login?error=auth_error`);
    }

    return NextResponse.redirect(`${origin}${destination}`);
  }

  // PKCEフロー（code）
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Auth callback error:", error);
      // エラー時はログインページにリダイレクト
      return NextResponse.redirect(`${origin}/login?error=auth_error`);
    }

    return NextResponse.redirect(`${origin}${destination}`);
  }

  // code も token_hash もない場合はログインページへ
  return NextResponse.redirect(`${origin}/login`);
}
