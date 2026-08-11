-- 既存の片方向ポリシーを削除
DROP POLICY IF EXISTS "Users can view shared collection entries" ON collection_entries;

-- 双方向共有: 承認済みフレンドの棚を閲覧可能
CREATE POLICY "Users can view friend collection entries"
  ON collection_entries FOR SELECT
  USING (
    user_id = auth.uid()  -- 自分のエントリー
    OR EXISTS (
      SELECT 1 FROM shelf_shares
      WHERE status = 'accepted'
      AND (
        -- 自分が招待した人のエントリー
        (owner_id = auth.uid() AND shared_with_id = collection_entries.user_id)
        OR
        -- 自分を招待した人のエントリー
        (shared_with_id = auth.uid() AND owner_id = collection_entries.user_id)
      )
    )
  );;
