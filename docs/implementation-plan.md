# Bottle Keep - お酒コレクションアプリ実装計画

## 技術スタック
- **Frontend**: Next.js 14 (App Router)
- **Database/Auth/Storage**: Supabase (PostgreSQL + RLS + Auth + Storage)
- **LLM**: Gemini API (画像認識 + 情報取得)
- **PWA**: next-pwa（ホームに追加対応）
- **Hosting**: Vercel

### アーキテクチャ
```
[ブラウザ/PWA] <---> [Vercel (Next.js)] <---> [Supabase]
                            |
                            v
                      [Gemini API]
```

- **バックエンドレス構成**: 専用のバックエンドサーバーは不要
- **Supabase直接アクセス**: 認証・DB・ストレージはフロントエンドから直接呼び出し
- **API Routes**: Gemini APIキーを隠すためのプロキシとしてのみ使用
- **RLS**: データベース側でアクセス制御（サーバーロジック不要）

---

## PWA対応（モバイルアプリ化）

### 必要なファイル
```
public/
├── manifest.json          # アプリ名、アイコン、テーマカラー
├── icons/
│   ├── icon-192x192.png   # Android用
│   ├── icon-512x512.png   # スプラッシュ用
│   └── apple-icon.png     # iOS用
└── sw.js                  # Service Worker（next-pwaが生成）
```

### manifest.json の設定
```json
{
  "name": "Bottle Keep",
  "short_name": "BottleKeep",
  "description": "お酒コレクション管理アプリ",
  "start_url": "/shelf",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1a1a1a",
  "orientation": "portrait",
  "icons": [...]
}
```

### モバイルファースト設計
- タッチ操作に最適化したUI
- 下部固定ナビゲーション（iOS/Android風）
- カメラ直接起動ボタン
- スワイプでの操作対応
- オフライン表示対応（キャッシュ済みデータ）

---

## データベース設計

### テーブル構成

```sql
-- ユーザープロファイル
profiles (id, display_name, avatar_url, created_at, updated_at)

-- お酒マスターデータ
alcohols (id, name, type, subtype, brand, producer, origin_country,
          origin_region, alcohol_percentage, price_range, characteristics,
          raw_llm_response, created_at, updated_at)

-- ユーザーのコレクション
collection_entries (id, user_id, alcohol_id, photo_url, drinking_date,
                    rating, memo, created_at, updated_at)

-- 棚の共有
shelf_shares (id, owner_id, shared_with_id, status, created_at, accepted_at)
```

### RLSポリシー
- 自分のデータは読み書き可能
- 共有されたユーザーのコレクションは読み取り可能
- alcoholsテーブルは認証済みユーザー全員が読み書き可能

---

## ディレクトリ構成

```
app/
├── layout.tsx                     # PWA meta tags, viewport設定
├── (auth)/
│   ├── login/page.tsx
│   └── signup/page.tsx
├── (protected)/
│   ├── layout.tsx                 # 下部ナビゲーション
│   ├── shelf/page.tsx             # メインのコレクション一覧
│   ├── shelf/[id]/page.tsx        # 詳細・編集
│   ├── add/page.tsx               # 新規追加（写真 or 手動入力）
│   ├── add/confirm/page.tsx       # AI検出結果の確認
│   ├── shared/page.tsx            # 共有管理
│   └── shared/[userId]/page.tsx   # 共有された棚の閲覧
├── api/
│   ├── alcohols/analyze/route.ts  # Gemini画像分析
│   ├── collection/route.ts        # コレクションCRUD
│   └── shares/merged/route.ts     # マージされた棚の取得
└── middleware.ts                  # 認証ミドルウェア

components/
├── layout/
│   ├── bottom-nav.tsx             # モバイル用下部ナビ
│   └── install-prompt.tsx         # PWAインストール促進
├── ui/
│   ├── star-rating.tsx            # タッチ対応星評価
│   └── camera-button.tsx          # カメラ起動ボタン
└── ...

public/
├── manifest.json
└── icons/

lib/
├── supabase/
│   ├── client.ts
│   └── server.ts
└── gemini/
    ├── client.ts
    └── prompts.ts

next.config.js                     # next-pwa設定
```

---

## 実装フェーズ

### Phase 1: 基盤構築 + PWA設定
1. Next.js 14 + Tailwind CSS セットアップ
2. **next-pwa 設定、manifest.json、アイコン作成**
3. **モバイルファーストのビューポート設定**
4. Supabase プロジェクト作成・接続
5. 認証機能（ログイン/サインアップ）
6. データベーステーブル・RLS作成

### Phase 2: コアコレクション機能
1. 手動入力によるお酒登録
2. 写真アップロード（Supabase Storage）
3. **カメラ直接起動対応**
4. コレクション一覧表示（グリッド/リスト）
5. 詳細表示・編集・削除
6. **下部固定ナビゲーション実装**

### Phase 3: AI連携
1. Gemini API セットアップ
2. ラベル画像からの情報抽出
3. 抽出結果の確認・編集UI
4. Web検索による追加情報取得

### Phase 4: 棚共有機能
1. 共有リクエスト送信・承認
2. 共有一覧の管理
3. マージされた棚の表示
4. 同じお酒の複数ユーザーエントリ表示

### Phase 5: 仕上げ
1. ローディング・エラー処理
2. **PWAインストール促進UI**
3. **オフライン対応（Service Worker）**
4. パフォーマンス最適化
5. テスト・デプロイ

---

## 重要な実装ポイント

### PWA設定 (next-pwa)
```js
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
})
```

### モバイルUI
- ビューポート: `width=device-width, initial-scale=1, viewport-fit=cover`
- Safe Area対応（ノッチ、ホームバー）
- タッチターゲット: 最小44x44px
- 下部ナビ: 棚・追加・共有・設定

### 認証
- `@supabase/ssr` パッケージを使用（最新推奨）
- Cookie-based authでSSR対応
- middlewareでトークンリフレッシュ

### Gemini API
- Gemini 2.0 Flash を使用（コスト効率良好）
- 構造化JSON出力でパース
- 画像から: 名前、種類、産地、度数、特徴を抽出

### 棚共有のマージロジック
- `alcohol_id` で重複を検出
- 同じお酒に対して複数ユーザーのエントリを配列で返す
- 各エントリには所有者情報を含める

---

## デプロイ（Vercel）

### セットアップ手順
1. GitHubリポジトリをVercelに接続
2. 環境変数を設定:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
3. デプロイ実行

### Vercelの利点
- Next.js との最適な統合
- API Routes が Edge/Serverless Functions として自動デプロイ
- プレビューデプロイ（PRごとに自動生成）
- 無料枠で十分運用可能（個人利用の場合）

### 本番環境設定
- カスタムドメイン設定（任意）
- Supabase の本番プロジェクト作成
- 環境変数を本番用に切り替え

---

## 検証方法

1. **PWA**: Chrome DevTools > Application > Manifest確認、「ホームに追加」動作確認
2. **認証**: ログイン/ログアウト/セッション維持の確認
3. **コレクション**: 追加・編集・削除の動作確認
4. **AI分析**: 各種ラベル画像での抽出精度確認
5. **共有機能**: 2アカウントで相互共有・マージ表示確認
6. **RLS**: 未共有ユーザーのデータにアクセスできないことを確認
7. **モバイル**: 実機（iOS Safari / Android Chrome）での動作確認
