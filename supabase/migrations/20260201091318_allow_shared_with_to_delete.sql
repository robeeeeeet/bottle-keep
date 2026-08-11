-- 既存のDELETEポリシーを削除
DROP POLICY IF EXISTS "Users can delete shares they own" ON shelf_shares;

-- 新しいポリシー: オーナーまたは受け入れ側から削除可能
CREATE POLICY "Users can delete shares they are involved in"
ON shelf_shares
FOR DELETE
TO authenticated
USING (owner_id = auth.uid() OR shared_with_id = auth.uid());;
