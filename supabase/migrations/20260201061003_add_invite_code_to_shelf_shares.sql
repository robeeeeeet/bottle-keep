-- 招待コードカラムを追加
ALTER TABLE shelf_shares ADD COLUMN invite_code TEXT UNIQUE;

-- shared_with_id を nullable に変更（招待作成時は未定）
ALTER TABLE shelf_shares ALTER COLUMN shared_with_id DROP NOT NULL;

-- インデックス追加（招待コード検索用）
CREATE INDEX idx_shelf_shares_invite_code ON shelf_shares(invite_code);

-- コメント追加
COMMENT ON COLUMN shelf_shares.invite_code IS '招待リンク用のユニークコード';;
