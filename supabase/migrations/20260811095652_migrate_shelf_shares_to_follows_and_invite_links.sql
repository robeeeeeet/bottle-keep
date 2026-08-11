-- ============================================================
-- 既存データの移行（shelf_shares → follows / invite_links）
--
-- 現在の相互共有は「双方向に見える」状態なので、follows を2行入れて
-- 現在の見え方をそのまま維持する。
-- 配布済みの招待コードも invite_links に移して生かす。
-- ============================================================

-- 1. 承認済みの相互関係 → 双方向のフォロー2行
insert into public.follows (follower_id, followee_id, created_at)
select s.owner_id, s.shared_with_id, coalesce(s.accepted_at, s.created_at)
from public.shelf_shares s
where s.status = 'accepted'
  and s.shared_with_id is not null
  and s.owner_id <> s.shared_with_id
on conflict (follower_id, followee_id) do nothing;

insert into public.follows (follower_id, followee_id, created_at)
select s.shared_with_id, s.owner_id, coalesce(s.accepted_at, s.created_at)
from public.shelf_shares s
where s.status = 'accepted'
  and s.shared_with_id is not null
  and s.owner_id <> s.shared_with_id
on conflict (follower_id, followee_id) do nothing;

-- 2. 未使用の招待コード → 招待リンク（1ユーザー1本だけ、最新のものを採用）
insert into public.invite_links (user_id, code, created_at)
select distinct on (s.owner_id) s.owner_id, s.invite_code, s.created_at
from public.shelf_shares s
where s.status = 'pending'
  and s.shared_with_id is null
  and s.invite_code is not null
  and not exists (
    select 1 from public.invite_links l
    where l.user_id = s.owner_id and l.revoked_at is null
  )
order by s.owner_id, s.created_at desc
on conflict (code) do nothing;;
