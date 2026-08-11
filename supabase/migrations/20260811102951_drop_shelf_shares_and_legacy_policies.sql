-- ============================================================
-- Phase 5: 旧・相互共有（shelf_shares）の撤去
--
-- 新UIのデプロイと動作確認が済んだので、shelf_shares を参照する
-- 古いRLSポリシーとテーブル本体を削除する。
-- 可視性は follows ベースのポリシーだけになる。
-- ============================================================

-- collection_entries: 旧「フレンドの投稿が見える」ポリシーを削除
-- （follows ベースの "Users can view entries of users they follow" が残る）
drop policy if exists "Users can view friend collection entries" on public.collection_entries;
-- 「自分の投稿だけ見える」旧ポリシーも follows 版に包含されるため削除
drop policy if exists "Users can view own collection entries" on public.collection_entries;

-- profiles: 旧「自分とフレンドが見える」ポリシーを削除
-- （follows ベースの "Users can view profiles in follow relations" が残る）
drop policy if exists "Users can view own and friend profiles" on public.profiles;

-- shelf_shares のポリシーとテーブルを削除
drop policy if exists "Users can view shares they are involved in" on public.shelf_shares;
drop policy if exists "Anyone can view invite by code" on public.shelf_shares;
drop policy if exists "Users can create shares as owner" on public.shelf_shares;
drop policy if exists "Users can claim invites" on public.shelf_shares;
drop policy if exists "Users can update shares they received" on public.shelf_shares;
drop policy if exists "Users can delete shares they are involved in" on public.shelf_shares;

drop table if exists public.shelf_shares;;
