-- 管理者チェック用のSECURITY DEFINER関数を作成（RLSをバイパス）
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- 既存の問題のあるポリシーを削除
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all collection entries" ON public.collection_entries;
DROP POLICY IF EXISTS "Admins can view all alcohols" ON public.alcohols;

-- 修正したポリシーを再作成（is_admin()関数を使用）
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Admins can view all collection entries"
ON public.collection_entries
FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Admins can view all alcohols"
ON public.alcohols
FOR SELECT
TO authenticated
USING (is_admin());;
