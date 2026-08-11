import { FunctionsHttpError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

// Edge Function呼び出しのタイムアウト（ミリ秒）
const ANALYZE_TIMEOUT_MS = 30000;

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

/** タイムアウト（中断）によるエラーかどうかを判定する */
function isTimeoutError(error: unknown): boolean {
  const timeoutNames = ["TimeoutError", "AbortError"];
  if (error instanceof Error && timeoutNames.includes(error.name)) return true;
  // FunctionsFetchError は元のエラーを context に保持する
  const context = (error as { context?: unknown } | null)?.context;
  return context instanceof Error && timeoutNames.includes(context.name);
}

/**
 * invoke() のエラーからユーザー向けメッセージを組み立てる
 * non-2xxの場合 data は null になり、本文は FunctionsHttpError.context に入る
 */
async function toErrorMessage(error: unknown): Promise<string> {
  const defaultMessage = "分析に失敗しました";

  if (error instanceof FunctionsHttpError) {
    try {
      const body: unknown = await error.context.json();
      if (
        body &&
        typeof body === "object" &&
        typeof (body as { error?: unknown }).error === "string"
      ) {
        return (body as { error: string }).error;
      }
    } catch {
      // JSON以外の本文（HTML等）はそのまま表示しない
    }
    return defaultMessage;
  }

  if (isTimeoutError(error)) {
    return "分析がタイムアウトしました。通信環境を確認して再度お試しください";
  }

  return error instanceof Error && error.message ? error.message : defaultMessage;
}

/**
 * Gemini APIを使ってお酒の情報を分析する
 * @param params.rejectedName ユーザーが「違う」と言った銘柄名（代替候補を取得する際に使用）
 * @returns 一意に特定できた場合はAlcoholInfo、複数候補がある場合はcandidates配列を含むオブジェクト
 */
export async function analyzeAlcohol(
  params: AnalyzeParams
): Promise<AnalyzeResponse> {
  const supabase = createClient();

  // supabase.functions.invoke() を使用することで認証を自動処理
  const { data, error } = await supabase.functions.invoke("analyze-alcohol", {
    body: params,
    // 応答が詰まった場合はタイムアウトさせる（内部でAbortControllerが使われる）
    timeout: ANALYZE_TIMEOUT_MS,
  });

  if (error) {
    console.error("Function error:", error);
    throw new Error(await toErrorMessage(error));
  }

  // data が null の場合のエラーハンドリング
  if (!data) {
    throw new Error("レスポンスが空です");
  }

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
