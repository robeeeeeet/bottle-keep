# Supabase Edge Functions

## 構成

```
supabase/functions/
└── analyze-alcohol/    # お酒画像/テキストをGemini AIで分析
    └── index.ts
```

## デプロイ方法

### 方法1: Supabase MCP経由（推奨）

Claude Codeの `mcp__supabase__deploy_edge_function` ツールを使用。

### 方法2: Supabase CLI

```bash
# CLIインストール（未インストールの場合）
npm install -g supabase

# ログイン
supabase login

# プロジェクトにリンク
supabase link --project-ref ceygoqxqwpcitjswwvlq

# デプロイ
supabase functions deploy analyze-alcohol
```

## 環境変数

Edge Functionで使用する環境変数（Supabaseダッシュボードで設定）:

| 変数名 | 説明 |
|--------|------|
| `GEMINI_API_KEY` | Google AI Studio で取得 |
| `SUPABASE_URL` | 自動設定 |
| `SUPABASE_SERVICE_ROLE_KEY` | 自動設定 |

## analyze-alcohol

お酒の画像またはテキストからGemini 2.0 Flashで情報を抽出。

### エンドポイント

```
POST /functions/v1/analyze-alcohol
Authorization: Bearer <supabase_access_token>
```

### リクエスト

```typescript
// 画像URL指定
{ "imageUrl": "https://..." }

// Base64画像
{ "imageBase64": "..." }

// テキスト検索
{ "text": "獺祭", "type": "日本酒" }
```

### レスポンス

```typescript
{
  "name": "獺祭 純米大吟醸45",
  "type": "日本酒",
  "subtype": "純米大吟醸",
  "brand": "獺祭",
  "producer": "旭酒造",
  "origin_country": "日本",
  "origin_region": "山口県",
  "alcohol_percentage": 16,
  "price_range": "1500-2000円",
  "characteristics": ["フルーティーな香り", "繊細な味わい", "山田錦使用"]
}
```
