import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const type = requestUrl.searchParams.get("type");
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Auth callback error:", error);
      // エラー時はログインページにリダイレクト
      return NextResponse.redirect(`${origin}/login?error=auth_error`);
    }

    // パスワードリセットの場合
    if (type === "recovery") {
      return NextResponse.redirect(`${origin}/reset-password`);
    }

    // メール確認の場合（新規登録）
    return NextResponse.redirect(`${origin}/shelf`);
  }

  // codeがない場合はログインページへ
  return NextResponse.redirect(`${origin}/login`);
}
