import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // JWTをローカルで検証（ES256非対称鍵 + JWKSキャッシュ）
  // getUser()と違いAuthサーバーへの往復が発生しない。
  // トークン期限切れの場合のみ内部でリフレッシュが走る。
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ?? null;

  const pathname = request.nextUrl.pathname;

  // リダイレクト時もリフレッシュされたセッションCookieを引き継ぐ
  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie);
    });
    return response;
  };

  // ルートは認証状態に応じて即リダイレクト（ページ関数を起動させない）
  if (pathname === "/") {
    return redirectTo(user ? "/shelf" : "/login");
  }

  // 未認証ユーザーを保護されたルートからリダイレクト
  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isProtectedRoute =
    pathname.startsWith("/shelf") ||
    pathname.startsWith("/add") ||
    pathname.startsWith("/shared") ||
    pathname.startsWith("/likes") ||
    pathname.startsWith("/admin");
  // /invite は未ログインでも到達させ、ページ側で redirect 付きログインへ送る
  // （招待リンクを開いた人がログイン後に招待画面へ戻れるようにするため）

  if (!user && isProtectedRoute) {
    return redirectTo("/login");
  }

  if (user && isAuthRoute) {
    return redirectTo("/shelf");
  }

  return supabaseResponse;
}
