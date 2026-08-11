-- ============================================================
-- 共有機能の作り替え Phase 1: フォロー / 招待リンク / いいね の基盤
--
-- 方針: 既存ポリシー（shelf_shares参照）は削除せず「追加」のみ行う。
-- 許可ポリシーはORで合成されるため、この時点では現行アプリが無変更で動く。
-- 旧ポリシーとshelf_sharesの撤去は、新UIのデプロイ後（Phase 5）に行う。
-- ============================================================

-- ------------------------------------------------------------
-- 1. テーブル（関数より先に作る。関数本体は作成時に検証されるため）
-- ------------------------------------------------------------

-- follows: フォロー関係（非対称。A→B と B→A は別の行）
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint follows_no_self_follow check (follower_id <> followee_id)
);

-- follower_id は主キーの先頭列なので索引済み。フォロワー一覧用に逆方向を張る
create index if not exists follows_followee_id_idx on public.follows (followee_id);

-- invite_links: 使い回せる招待リンク（有効なものは1人1本）
create table if not exists public.invite_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- 有効なリンクは1ユーザー1本に制限（再発行は旧行にrevoked_atを入れてから作る）
create unique index if not exists invite_links_one_active_per_user_idx
  on public.invite_links (user_id) where revoked_at is null;

create index if not exists invite_links_user_id_idx on public.invite_links (user_id);

-- post_likes: いいね ＋ 自分用メモ
create table if not exists public.post_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  entry_id uuid not null references public.collection_entries(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, entry_id)
);

create index if not exists post_likes_entry_id_idx on public.post_likes (entry_id);
create index if not exists post_likes_user_created_idx on public.post_likes (user_id, created_at desc);

-- いいね数（非正規化）。投稿者に「数だけ」を見せ、いいねした人には触れさせない
alter table public.collection_entries
  add column if not exists like_count integer not null default 0;

-- フィード取得用の索引
create index if not exists collection_entries_user_created_idx
  on public.collection_entries (user_id, created_at desc);

-- ------------------------------------------------------------
-- 2. ヘルパー関数
-- RLSポリシー内で同じテーブルを自己参照すると別名解決が曖昧になるため、
-- 曖昧さ・再帰の恐れがある箇所のみ SECURITY DEFINER 関数に切り出す。
-- ------------------------------------------------------------

-- 指定ユーザーが自分をフォローしているか（フォロー返しの判定に使う）
create or replace function public.follows_me(target_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path to 'public'
as $$
  select exists (
    select 1 from public.follows
    where follower_id = target_user_id
      and followee_id = auth.uid()
  );
$$;

revoke execute on function public.follows_me(uuid) from public, anon;
grant execute on function public.follows_me(uuid) to authenticated;

-- いいねできるのは「他人の投稿」かつ「自分がフォローしている人の投稿」だけ
create or replace function public.can_like_entry(target_entry_id uuid)
returns boolean
language sql
security definer
stable
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.collection_entries ce
    where ce.id = target_entry_id
      and ce.user_id <> auth.uid()
      and exists (
        select 1 from public.follows f
        where f.follower_id = auth.uid()
          and f.followee_id = ce.user_id
      )
  );
$$;

revoke execute on function public.can_like_entry(uuid) from public, anon;
grant execute on function public.can_like_entry(uuid) to authenticated;

-- ------------------------------------------------------------
-- 3. RLS
-- ------------------------------------------------------------

alter table public.follows enable row level security;

-- 参照: 自分が関わる行のみ（する側・される側の両方）
create policy "Users can view own follow relations"
  on public.follows for select to authenticated
  using (follower_id = auth.uid() or followee_id = auth.uid());

-- 追加: フォロー返しのみRLSで許可する。
-- 招待リンク経由のフォローは follow_via_invite() が担う
-- （「リンクを使った」証明はRLSでは表現できないため）。
create policy "Users can follow back their followers"
  on public.follows for insert to authenticated
  with check (
    follower_id = auth.uid()
    and public.follows_me(followee_id)
  );

-- 削除: フォロー解除（する側）と、フォロワーを外す（される側）の両方を許可
create policy "Users can remove follow relations they are part of"
  on public.follows for delete to authenticated
  using (follower_id = auth.uid() or followee_id = auth.uid());

alter table public.invite_links enable row level security;

-- 参照は自分の分だけ。コードからの逆引きは peek_invite/follow_via_invite が行う
create policy "Users can view own invite links"
  on public.invite_links for select to authenticated
  using (user_id = auth.uid());

create policy "Users can create own invite links"
  on public.invite_links for insert to authenticated
  with check (user_id = auth.uid());

-- 再発行（revoked_atの設定）用
create policy "Users can revoke own invite links"
  on public.invite_links for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table public.post_likes enable row level security;

-- 参照は自分の行のみ（＝投稿者は誰がいいねしたか分からない）
create policy "Users can view own likes"
  on public.post_likes for select to authenticated
  using (user_id = auth.uid());

create policy "Users can like visible entries of others"
  on public.post_likes for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.can_like_entry(entry_id)
  );

-- メモの編集はフォロー解除後も可能にする（本文は見えなくなるがメモは残す仕様）
create policy "Users can update own likes"
  on public.post_likes for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete own likes"
  on public.post_likes for delete to authenticated
  using (user_id = auth.uid());

-- 追加のSELECTポリシー（既存の own / friend ポリシーとORで合成される）
create policy "Users can view entries of users they follow"
  on public.collection_entries for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.follows f
      where f.follower_id = auth.uid()
        and f.followee_id = collection_entries.user_id
    )
  );

-- profiles: フォロワー一覧に名前を出すため「自分をフォローしている人」も参照可にする
-- （フォロー返しの動線に必要）
create policy "Users can view profiles in follow relations"
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.follows f
      where (f.follower_id = auth.uid() and f.followee_id = profiles.id)
         or (f.followee_id = auth.uid() and f.follower_id = profiles.id)
    )
  );

-- ------------------------------------------------------------
-- 4. like_count の保護とトリガー
-- ------------------------------------------------------------

-- like_count はトリガーだけが更新する。
-- authenticated のテーブル全体UPDATE権限を剥奪し、更新可能な列だけを許可する
-- （テーブル単位の権限は列単位の権限より優先されるため、先にrevokeが必要）。
revoke update on public.collection_entries from authenticated, anon;
grant update (photo_url, drinking_date, rating, memo, updated_at)
  on public.collection_entries to authenticated;

-- いいねの増減に応じて like_count を同期する（SECURITY DEFINERなので列権限に縛られない）
create or replace function public.sync_entry_like_count()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if (tg_op = 'INSERT') then
    update public.collection_entries
      set like_count = like_count + 1
      where id = new.entry_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.collection_entries
      set like_count = greatest(like_count - 1, 0)
      where id = old.entry_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists post_likes_sync_like_count on public.post_likes;
create trigger post_likes_sync_like_count
  after insert or delete on public.post_likes
  for each row execute function public.sync_entry_like_count();;
