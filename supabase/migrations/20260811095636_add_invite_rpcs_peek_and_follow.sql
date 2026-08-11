-- ============================================================
-- 招待リンクのRPC
--
-- 「リンクを使った」という事実はRLSでは表現できないため、
-- コードの逆引きと follows への挿入は SECURITY DEFINER 関数に閉じ込める。
-- 例外ではなくステータス文字列を返し、呼び出し側で文言に対応させる。
-- ============================================================

-- 招待の中身を確認するだけ（何も変更しない）。確認画面の表示に使う
create or replace function public.peek_invite(invite_code text)
returns jsonb
language plpgsql
security definer
stable
set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_owner uuid;
  v_name text;
begin
  if v_me is null then
    return jsonb_build_object('status', 'auth_required');
  end if;

  select l.user_id into v_owner
  from public.invite_links l
  where l.code = invite_code
    and l.revoked_at is null;

  if v_owner is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  if v_owner = v_me then
    return jsonb_build_object('status', 'self');
  end if;

  select p.display_name into v_name
  from public.profiles p
  where p.id = v_owner;

  return jsonb_build_object(
    'status', case
      when exists (
        select 1 from public.follows
        where follower_id = v_me and followee_id = v_owner
      ) then 'already_following'
      else 'ok'
    end,
    'followee_id', v_owner,
    'display_name', v_name
  );
end;
$$;

revoke execute on function public.peek_invite(text) from public, anon;
grant execute on function public.peek_invite(text) to authenticated;

-- 招待リンクを使ってフォローする
create or replace function public.follow_via_invite(invite_code text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_owner uuid;
  v_name text;
begin
  if v_me is null then
    return jsonb_build_object('status', 'auth_required');
  end if;

  select l.user_id into v_owner
  from public.invite_links l
  where l.code = invite_code
    and l.revoked_at is null;

  if v_owner is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  if v_owner = v_me then
    return jsonb_build_object('status', 'self');
  end if;

  select p.display_name into v_name
  from public.profiles p
  where p.id = v_owner;

  -- 既にフォロー済みでも成功として扱う（リンクを二度開いた場合など）
  insert into public.follows (follower_id, followee_id)
  values (v_me, v_owner)
  on conflict (follower_id, followee_id) do nothing;

  return jsonb_build_object(
    'status', 'ok',
    'followee_id', v_owner,
    'display_name', v_name
  );
end;
$$;

revoke execute on function public.follow_via_invite(text) from public, anon;
grant execute on function public.follow_via_invite(text) to authenticated;;
