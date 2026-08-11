-- 管理者用RPCの匿名(anon)実行を禁止する多層防御。
-- 各関数は内部で is_admin() を検証しているが、匿名ロールからは
-- そもそも呼べないようにして攻撃対象面を減らす（security advisor 0028対応）。
revoke execute on function public.get_all_profiles_admin() from public, anon;
grant execute on function public.get_all_profiles_admin() to authenticated;

revoke execute on function public.get_user_emails_admin() from public, anon;
grant execute on function public.get_user_emails_admin() to authenticated;

revoke execute on function public.get_all_collection_entries_admin() from public, anon;
grant execute on function public.get_all_collection_entries_admin() to authenticated;

revoke execute on function public.get_user_collection_entries_admin(uuid) from public, anon;
grant execute on function public.get_user_collection_entries_admin(uuid) to authenticated;;
