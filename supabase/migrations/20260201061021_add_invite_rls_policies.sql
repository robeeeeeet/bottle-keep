-- 招待リンク経由でのアクセス（未承認の招待をコードで検索可能）
CREATE POLICY "Anyone can view pending invite by code"
  ON shelf_shares FOR SELECT
  USING (
    invite_code IS NOT NULL 
    AND shared_with_id IS NULL 
    AND status = 'pending'
  );

-- 招待を受け取ったユーザーが自分のIDを設定（クレーム）
CREATE POLICY "Users can claim invites"
  ON shelf_shares FOR UPDATE
  USING (
    shared_with_id IS NULL 
    AND invite_code IS NOT NULL
    AND status = 'pending'
  )
  WITH CHECK (
    shared_with_id = auth.uid()
  );;
