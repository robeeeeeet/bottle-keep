import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AlcoholInfo {
  name: string;
  type: string;
  subtype?: string;
  brand?: string;
  producer?: string;
  origin_country?: string;
  origin_region?: string;
  alcohol_percentage?: number;
  price_range?: string;
  characteristics?: string[];
}

interface AnalyzeResponse {
  unique: boolean;
  result: AlcoholInfo | null;
  candidates?: AlcoholInfo[];
}

const ALCOHOL_INFO_SCHEMA = `{
  "name": "正式な商品名",
  "type": "種類（日本酒、ワイン、ビール、ウイスキー、焼酎、ブランデー、ジン、ラム、テキーラ、リキュール、その他）",
  "subtype": "サブタイプ（例: 純米大吟醸、カベルネ・ソーヴィニヨン、IPA等）",
  "brand": "ブランド名",
  "producer": "製造者・蔵元",
  "origin_country": "原産国",
  "origin_region": "産地（都道府県や地域）",
  "alcohol_percentage": アルコール度数（数値のみ）,
  "price_range": "価格帯（例: 1000-2000円、3000円前後）",
  "characteristics": ["特徴1", "特徴2", "特徴3"]
}`;

const SYSTEM_PROMPT = `あなたはお酒の専門家です。与えられた情報（画像またはテキスト）からお酒を特定し、詳細情報を提供してください。

## 回答形式

以下のJSON形式で回答してください（日本語で）：

### 一意に特定できる場合:
{
  "unique": true,
  "result": ${ALCOHOL_INFO_SCHEMA}
}

### 候補が複数ある場合（同名の銘柄で種類や等級が異なるものがある場合など）:
{
  "unique": false,
  "result": null,
  "candidates": [
    ${ALCOHOL_INFO_SCHEMA},
    // 最大5件まで
  ]
}

## 重要なルール

1. 画像から明確にラベルが読み取れる場合は unique: true で1件だけ返す
2. テキスト検索で同名のお酒に複数のバリエーション（等級違い、年代違い等）がある場合は candidates で最大5件返す
3. 不明な項目はnullにする
4. 推測できる場合は推測してよい
5. candidatesは人気度や一般的な認知度が高い順に並べる`;

const ALTERNATIVES_PROMPT = `あなたはお酒の専門家です。ユーザーが探しているお酒の候補を提供してください。

## 状況

ユーザーは以下の情報でお酒を検索しました。最初の候補「{rejectedName}」は違うかもしれないので、
他の候補も含めて選択肢を提供してください。

## 回答形式

必ず以下のJSON形式で複数の候補を返してください（日本語で）：
{
  "unique": false,
  "result": null,
  "candidates": [
    ${ALCOHOL_INFO_SCHEMA},
    // 最大5件まで
  ]
}

## 重要なルール

1. 「{rejectedName}」も候補の1つとして含める（誤タップの可能性があるため）
2. 同じブランドの別バリエーション、似た名前の別銘柄、同じ蔵元の別商品なども含める
3. candidatesは人気度や一般的な認知度が高い順に並べる
4. 最大5件まで返す`;

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[DEBUG] Request received");

    // リクエストヘッダーをログ
    const authHeader = req.headers.get("Authorization");
    console.log("[DEBUG] Auth header exists:", !!authHeader);

    if (!authHeader) {
      console.log("[DEBUG] No auth header - returning 401");
      return new Response(JSON.stringify({ error: "認証が必要です" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    console.log("[DEBUG] Token length:", token.length);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("[DEBUG] Auth error:", authError?.message || "No user");
      return new Response(JSON.stringify({ error: "認証に失敗しました" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[DEBUG] User authenticated:", user.id);

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      console.error("[DEBUG] GEMINI_API_KEY not set");
      throw new Error("GEMINI_API_KEY is not set");
    }
    console.log("[DEBUG] Gemini API key exists");

    const body = await req.json();
    console.log("[DEBUG] Request body keys:", Object.keys(body));

    const { imageUrl, imageBase64, text, type, rejectedName } = body;

    if (!imageUrl && !imageBase64 && !text) {
      console.error("[DEBUG] No input provided");
      throw new Error("imageUrl, imageBase64, or text is required");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const parts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    > = [];

    const requestingAlternatives = !!rejectedName;

    if (imageUrl || imageBase64) {
      let base64Data: string;
      let mimeType = "image/jpeg";

      if (imageBase64) {
        base64Data = imageBase64;
        console.log("[DEBUG] Using imageBase64");
      } else if (imageUrl) {
        console.log("[DEBUG] Fetching image from URL:", imageUrl.substring(0, 50) + "...");
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          console.error("[DEBUG] Image fetch failed:", imageResponse.status);
          throw new Error(`Failed to fetch image: ${imageResponse.status}`);
        }
        const arrayBuffer = await imageResponse.arrayBuffer();
        base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        mimeType = imageResponse.headers.get("content-type") || "image/jpeg";
        console.log("[DEBUG] Image fetched, size:", arrayBuffer.byteLength);
      }

      parts.push({
        inlineData: {
          mimeType,
          data: base64Data!,
        },
      });

      if (requestingAlternatives) {
        const prompt = ALTERNATIVES_PROMPT.replace(/{rejectedName}/g, rejectedName);
        parts.push({
          text: prompt + `\n\nこの画像のお酒について、「${rejectedName}」を含む候補を提供してください。`,
        });
      } else {
        parts.push({
          text:
            SYSTEM_PROMPT +
            "\n\nこの画像のお酒ラベルから情報を抽出してください。ラベルが明確に読み取れる場合は unique: true で返してください。",
        });
      }
    } else {
      const typeText = type ? `種類: ${type}` : "";

      if (requestingAlternatives) {
        const prompt = ALTERNATIVES_PROMPT.replace(/{rejectedName}/g, rejectedName);
        parts.push({
          text: prompt + `\n\n検索情報：\n銘柄名: ${text}\n${typeText}`,
        });
      } else {
        parts.push({
          text:
            SYSTEM_PROMPT +
            `\n\n以下のお酒について情報を教えてください：\n銘柄名: ${text}\n${typeText}\n\n同名で複数のバリエーション（等級違い、種類違い等）がある場合は candidates として最大5件返してください。`,
        });
      }
    }

    console.log("[DEBUG] Calling Gemini API...");
    const result = await model.generateContent(parts);
    const response = result.response;
    const responseText = response.text();
    console.log("[DEBUG] Gemini response length:", responseText.length);

    let analyzeResponse: AnalyzeResponse;
    try {
      analyzeResponse = JSON.parse(responseText);
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analyzeResponse = JSON.parse(jsonMatch[0]);
      } else {
        console.error("[DEBUG] Failed to parse JSON:", responseText.substring(0, 100));
        throw new Error("Failed to parse response as JSON");
      }
    }

    if (analyzeResponse.unique === undefined) {
      const legacyResponse = analyzeResponse as unknown as AlcoholInfo;
      analyzeResponse = {
        unique: true,
        result: legacyResponse,
      };
    }

    console.log("[DEBUG] Success - returning response");
    return new Response(JSON.stringify(analyzeResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[DEBUG] Error:", error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
