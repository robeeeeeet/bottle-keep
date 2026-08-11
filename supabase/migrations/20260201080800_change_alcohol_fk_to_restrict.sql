
-- collection_entries.alcohol_id の外部キー制約を
-- CASCADE から RESTRICT に変更（誤削除防止）
ALTER TABLE collection_entries 
  DROP CONSTRAINT collection_entries_alcohol_id_fkey;

ALTER TABLE collection_entries 
  ADD CONSTRAINT collection_entries_alcohol_id_fkey 
    FOREIGN KEY (alcohol_id) 
    REFERENCES alcohols(id) 
    ON DELETE RESTRICT;

COMMENT ON CONSTRAINT collection_entries_alcohol_id_fkey ON collection_entries IS 
  '他ユーザーの記録がある場合、alcoholsの削除を禁止する';
;
