
-- shelf_shares.owner_id から profiles.id への外部キーを追加
ALTER TABLE shelf_shares
ADD CONSTRAINT shelf_shares_owner_profiles_fkey
FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- shelf_shares.shared_with_id から profiles.id への外部キーを追加
ALTER TABLE shelf_shares
ADD CONSTRAINT shelf_shares_shared_with_profiles_fkey
FOREIGN KEY (shared_with_id) REFERENCES profiles(id) ON DELETE CASCADE;
;
