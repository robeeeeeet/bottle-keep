import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// 通常はmiddlewareが認証状態に応じてリダイレクトするため、
// このページはフォールバックとしてのみ動作する（getClaimsはローカルJWT検証で高速）
export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect("/shelf");
  } else {
    redirect("/login");
  }
}
