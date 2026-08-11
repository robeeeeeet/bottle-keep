-- ユーザーのコレクション（棚）テーブル
create table collection_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  alcohol_id uuid not null references alcohols(id) on delete cascade,
  photo_url text,
  drinking_date date,
  rating smallint check (rating >= 1 and rating <= 5),
  memo text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- RLS有効化
alter table collection_entries enable row level security;

-- RLSポリシー: 自分のエントリのみ参照・操作可能
create policy "Users can view own collection entries"
  on collection_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert own collection entries"
  on collection_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own collection entries"
  on collection_entries for update
  using (auth.uid() = user_id);

create policy "Users can delete own collection entries"
  on collection_entries for delete
  using (auth.uid() = user_id);

-- インデックス
create index collection_entries_user_id_idx on collection_entries(user_id);
create index collection_entries_alcohol_id_idx on collection_entries(alcohol_id);
create index collection_entries_drinking_date_idx on collection_entries(drinking_date desc);;
