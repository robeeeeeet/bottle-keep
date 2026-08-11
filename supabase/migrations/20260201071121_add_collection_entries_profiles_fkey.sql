
-- collection_entries.user_id から profiles.id への外部キーを追加
-- auth.usersへの外部キーとは別に、profilesへのJOINを可能にする
ALTER TABLE collection_entries
ADD CONSTRAINT collection_entries_profiles_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
;
