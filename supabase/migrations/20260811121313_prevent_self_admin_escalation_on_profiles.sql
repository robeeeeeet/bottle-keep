-- ============================================================
-- 重大な権限昇格の修正
--
-- profiles のRLSは「自分の行を更新できる」を許可しているが、列の制限が無く
-- authenticated に is_admin のUPDATE権限まで付与されていたため、
--   update profiles set is_admin = true where id = auth.uid()
-- で誰でも管理者になれてしまっていた（実測で確認）。
-- 管理者になると get_user_emails_admin() 等から全ユーザーのメールアドレスや
-- 全投稿が閲覧できるため影響が大きい。
--
-- collection_entries.like_count と同じ方針で、更新して良い列だけを許可する。
-- （テーブル単位の権限は列単位より優先されるため、先にrevokeが必要）
-- ============================================================

revoke update on public.profiles from authenticated, anon;

-- ユーザーが自分で変更して良いのは表示名とアバターのみ
grant update (display_name, avatar_url, updated_at)
  on public.profiles to authenticated;;
