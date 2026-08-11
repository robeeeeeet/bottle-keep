-- お酒マスターテーブル（重複排除用）
create table alcohols (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,  -- ビール、ワイン、日本酒、ウイスキー等
  subtype text,        -- IPA、赤ワイン、純米大吟醸等
  brand text,
  producer text,       -- 醸造所/蒸留所
  origin_country text,
  origin_region text,
  alcohol_percentage decimal(4,1),
  price_range text,    -- 価格帯（$, $$, $$$等）
  characteristics text[], -- 特徴タグ
  raw_llm_response jsonb, -- Gemini APIの生レスポンス
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- RLS有効化
alter table alcohols enable row level security;

-- RLSポリシー: 認証ユーザーは全て参照可能、挿入可能
create policy "Authenticated users can view all alcohols"
  on alcohols for select
  to authenticated
  using (true);

create policy "Authenticated users can insert alcohols"
  on alcohols for insert
  to authenticated
  with check (true);

-- インデックス
create index alcohols_name_idx on alcohols(name);
create index alcohols_type_idx on alcohols(type);;
