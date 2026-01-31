# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Bottle Keep - お酒のコレクションを管理するモバイルファーストPWAアプリケーション。

## コマンド

```bash
npm run dev      # 開発サーバー起動 (http://localhost:3000)
npm run build    # プロダクションビルド
npm run lint     # ESLint実行
```

## アーキテクチャ

### ルーティング構造（App Router）

```
src/app/
├── (auth)/              # 認証ページ（未ログイン用）
│   ├── login/
│   ├── signup/
│   └── actions/auth.ts  # Server Actions（login, signup, logout）
├── (protected)/         # 保護ページ（ログイン必須）
│   ├── layout.tsx       # ボトムナビ付きレイアウト
│   └── shelf/           # メインコレクション画面
└── page.tsx             # ルート（認証状態でリダイレクト）
```

### Supabaseクライアント構成

| ファイル | 用途 |
|---------|------|
| `lib/supabase/client.ts` | クライアントコンポーネント用 |
| `lib/supabase/server.ts` | Server Components / Server Actions用 |
| `lib/supabase/middleware.ts` | セッション更新 & 認証リダイレクト |

### データベーススキーマ

- `profiles` - ユーザープロフィール（auth.usersと1:1）
- `alcohols` - お酒マスターデータ（名前、種類、産地、特徴等）
- `collection_entries` - ユーザーのコレクション（写真、評価、メモ）
- `shelf_shares` - 棚の共有設定（ユーザー間共有）

全テーブルでRLS有効。ストレージは `photos` バケット（公開）。

## Supabase プロジェクト

- **Project ID**: `ceygoqxqwpcitjswwvlq`
- **Region**: ap-northeast-1 (Tokyo)

## 開発ルール

### Supabase操作
- DB操作（テーブル作成、RLS設定、マイグレーション）は **Supabase MCP** を使用
- SQLを直接実行せず、MCPツール経由で操作

### ブラウザ確認
- UI確認は **Playwright MCP** を使用
- ブラウザは**スマホサイズ（375x667）**で起動
- モバイルファーストのため、必ずスマホビューで検証

### テスト用ログイン
- `.env.local` 内の `LOGIN_EMAIL` と `LOGIN_PASSWORD` を使用
