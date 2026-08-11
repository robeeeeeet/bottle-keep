-- ============================================================
-- いいね通知
--
-- 「誰がいいねしたか」を投稿者に見せる。ただし post_likes のRLSは
-- 「自分の行のみ参照可」を維持する。行ごと見せてしまうと、いいねした人の
-- 非公開メモ（note）まで読めてしまうため（RLSは行単位で列を絞れない）。
-- そこで必要な列だけを返す SECURITY DEFINER 関数を用意する。
-- ============================================================

-- 通知をどこまで見たか（未読判定に使う）
alter table public.profiles
  add column if not exists likes_seen_at timestamptz;

-- 自分で更新できる列に likes_seen_at を追加
-- （is_admin は昇格防止のため引き続き対象外）
grant update (display_name, avatar_url, updated_at, likes_seen_at)
  on public.profiles to authenticated;

-- 自分の投稿へのいいねを新しい順に返す。note は返さない。
create or replace function public.get_like_notifications(max_rows integer default 50)
returns table (
  entry_id uuid,
  liked_at timestamptz,
  liker_id uuid,
  liker_name text,
  liker_avatar_url text,
  alcohol_name text,
  alcohol_type text,
  entry_photo_url text,
  is_unread boolean
)
language sql
security definer
stable
set search_path to 'public'
as $$
  select
    pl.entry_id,
    pl.created_at as liked_at,
    pl.user_id as liker_id,
    liker.display_name as liker_name,
    liker.avatar_url as liker_avatar_url,
    a.name as alcohol_name,
    a.type as alcohol_type,
    ce.photo_url as entry_photo_url,
    (me.likes_seen_at is null or pl.created_at > me.likes_seen_at) as is_unread
  from public.post_likes pl
  join public.collection_entries ce on ce.id = pl.entry_id
  left join public.alcohols a on a.id = ce.alcohol_id
  left join public.profiles liker on liker.id = pl.user_id
  join public.profiles me on me.id = auth.uid()
  where ce.user_id = auth.uid()      -- 自分の投稿へのいいねだけ
    and pl.user_id <> auth.uid()     -- 念のため自分のいいねは除く
  order by pl.created_at desc
  limit greatest(1, least(coalesce(max_rows, 50), 200));
$$;

revoke execute on function public.get_like_notifications(integer) from public, anon;
grant execute on function public.get_like_notifications(integer) to authenticated;

-- 未読件数だけを返す（バッジ表示用に軽量）
create or replace function public.count_unread_likes()
returns integer
language sql
security definer
stable
set search_path to 'public'
as $$
  select count(*)::integer
  from public.post_likes pl
  join public.collection_entries ce on ce.id = pl.entry_id
  join public.profiles me on me.id = auth.uid()
  where ce.user_id = auth.uid()
    and pl.user_id <> auth.uid()
    and (me.likes_seen_at is null or pl.created_at > me.likes_seen_at);
$$;

revoke execute on function public.count_unread_likes() from public, anon;
grant execute on function public.count_unread_likes() to authenticated;;
