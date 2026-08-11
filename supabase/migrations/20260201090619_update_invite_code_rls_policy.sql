-- 既存ポリシーを削除
DROP POLICY IF EXISTS "Anyone can view pending invite by code" ON shelf_shares;

-- 新しいポリシー: invite_codeがあるレコードは誰でも取得可能（使用済みかどうか判定するため）
CREATE POLICY "Anyone can view invite by code"
ON shelf_shares
FOR SELECT
TO authenticated
USING (invite_code IS NOT NULL);;
