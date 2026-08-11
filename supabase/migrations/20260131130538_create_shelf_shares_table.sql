-- 棚の共有テーブル
create table shelf_shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  shared_with_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz default now() not null,
  accepted_at timestamptz,
  
  -- 同じペアの重複を防止
  unique(owner_id, shared_with_id)
);

-- RLS有効化
alter table shelf_shares enable row level security;

-- RLSポリシー: 自分が関係する共有のみ参照・操作可能
create policy "Users can view shares they are involved in"
  on shelf_shares for select
  using (auth.uid() = owner_id or auth.uid() = shared_with_id);

create policy "Users can create shares as owner"
  on shelf_shares for insert
  with check (auth.uid() = owner_id);

create policy "Users can update shares they received"
  on shelf_shares for update
  using (auth.uid() = shared_with_id);

create policy "Users can delete shares they own"
  on shelf_shares for delete
  using (auth.uid() = owner_id);

-- 共有されたユーザーは相手のコレクションを参照できるポリシーを追加
create policy "Users can view shared collection entries"
  on collection_entries for select
  using (
    exists (
      select 1 from shelf_shares
      where shelf_shares.owner_id = collection_entries.user_id
        and shelf_shares.shared_with_id = auth.uid()
        and shelf_shares.status = 'accepted'
    )
  );

-- インデックス
create index shelf_shares_owner_id_idx on shelf_shares(owner_id);
create index shelf_shares_shared_with_id_idx on shelf_shares(shared_with_id);;
