-- 1. handle_new_user関数のsearch_pathを修正
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- 2. alcoholsテーブルのINSERTポリシーを修正（認証ユーザーに限定を明示）
drop policy if exists "Authenticated users can insert alcohols" on alcohols;

create policy "Authenticated users can insert alcohols"
  on alcohols for insert
  to authenticated
  with check (auth.uid() is not null);;
