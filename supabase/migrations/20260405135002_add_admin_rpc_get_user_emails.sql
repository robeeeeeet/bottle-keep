-- 管理者のみがユーザーのメールアドレスを取得できるRPC関数
CREATE OR REPLACE FUNCTION get_user_emails_admin()
RETURNS TABLE (id uuid, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 管理者チェック
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;
  
  -- auth.usersからid, emailを返す
  RETURN QUERY
  SELECT u.id, u.email::text
  FROM auth.users u;
END;
$$;;
