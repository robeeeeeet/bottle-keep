-- 写真保存用のストレージバケット作成
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true);

-- ストレージポリシー: 認証ユーザーはアップロード可能
create policy "Authenticated users can upload photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'photos');

-- ストレージポリシー: 誰でも閲覧可能（公開バケット）
create policy "Anyone can view photos"
  on storage.objects for select
  using (bucket_id = 'photos');

-- ストレージポリシー: 自分のファイルのみ削除可能
create policy "Users can delete own photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);;
