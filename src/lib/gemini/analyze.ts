import { createClient } from "@/lib/supabase/client";

export type AlcoholInfo = {
  name: string;
  type: string;
  subtype?: string | null;
  brand?: string | null;
  producer?: string | null;
  origin_country?: string | null;
  origin_region?: string | null;
  alcohol_percentage?: number | null;
  price_range?: string | null;
  characteristics?: string[] | null;
};

// Edge Functionからのレスポンス型
export type AnalyzeResponse =
  | { unique: true; result: AlcoholInfo }
  | { unique: false; result: null; candidates: AlcoholInfo[] };

type AnalyzeParams =
  | { imageUrl: string; rejectedName?: string }
  | { imageBase64: string; rejectedName?: string }
  | { text: string; type?: string; rejectedName?: string };

/**
 * Gemini APIを使ってお酒の情報を分析する
 * @param params.rejectedName ユーザーが「違う」と言った銘柄名（代替候補を取得する際に使用）
 * @returns 一意に特定できた場合はAlcoholInfo、複数候補がある場合はcandidates配列を含むオブジェクト
 */
export async function analyzeAlcohol(
  params: AnalyzeParams
): Promise<AnalyzeResponse> {
  const supabase = createClient();

  // 認証トークンを取得（getUser()を使用 - より信頼性が高い）
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("Auth error:", userError);
    throw new Error("認証が必要です");
  }

  // セッションからアクセストークンを取得
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("セッションが見つかりません");
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analyze-alcohol`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(params),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("API error:", response.status, errorText);
    try {
      const error = JSON.parse(errorText);
      throw new Error(error.error || "分析に失敗しました");
    } catch {
      throw new Error(`分析に失敗しました (${response.status})`);
    }
  }

  const data = await response.json();

  // 後方互換性: 古い形式のレスポンス（uniqueフィールドがない）を処理
  if (data.unique === undefined) {
    return {
      unique: true,
      result: data as AlcoholInfo,
    };
  }

  return data as AnalyzeResponse;
}

/**
 * 画像ファイルをBase64に変換する
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // data:image/jpeg;base64, の部分を除去
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
