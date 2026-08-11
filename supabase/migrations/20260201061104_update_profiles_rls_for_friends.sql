-- 既存のSELECTポリシーを削除
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- フレンドのプロフィールも閲覧可能に
CREATE POLICY "Users can view own and friend profiles"
  ON profiles FOR SELECT
  USING (
    id = auth.uid()  -- 自分
    OR EXISTS (
      SELECT 1 FROM shelf_shares
      WHERE status = 'accepted'
      AND (
        -- 自分が招待した人のプロフィール
        (owner_id = auth.uid() AND shared_with_id = profiles.id)
        OR
        -- 自分を招待した人のプロフィール
        (shared_with_id = auth.uid() AND owner_id = profiles.id)
      )
    )
  );;
