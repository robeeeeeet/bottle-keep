-- トリガー関数はRPCとして呼ばれるべきものではないため、EXECUTE権限を剥奪する。
-- トリガーからの実行はテーブル所有者の権限で行われるため影響しない。
revoke execute on function public.sync_entry_like_count() from public, anon, authenticated;;
