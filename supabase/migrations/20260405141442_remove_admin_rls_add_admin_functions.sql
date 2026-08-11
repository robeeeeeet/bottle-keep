-- 管理者用RLSポリシーを削除（shelfページでは通常ユーザーと同じ表示にするため）
DROP POLICY IF EXISTS "Admins can view all collection entries" ON public.collection_entries;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all alcohols" ON public.alcohols;

-- 管理者ページ用：全登録データを取得する関数（SECURITY DEFINER）
CREATE OR REPLACE FUNCTION get_all_collection_entries_admin()
RETURNS TABLE (
  id uuid,
  photo_url text,
  drinking_date date,
  rating smallint,
  memo text,
  created_at timestamptz,
  user_id uuid,
  alcohol_id uuid,
  alcohol_name text,
  alcohol_type text,
  alcohol_subtype text,
  user_display_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 管理者チェック
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;
  
  RETURN QUERY
  SELECT 
    ce.id,
    ce.photo_url,
    ce.drinking_date,
    ce.rating,
    ce.memo,
    ce.created_at,
    ce.user_id,
    ce.alcohol_id,
    a.name AS alcohol_name,
    a.type AS alcohol_type,
    a.subtype AS alcohol_subtype,
    p.display_name AS user_display_name
  FROM public.collection_entries ce
  LEFT JOIN public.alcohols a ON ce.alcohol_id = a.id
  LEFT JOIN public.profiles p ON ce.user_id = p.id
  ORDER BY ce.created_at DESC;
END;
$$;

-- 管理者ページ用：特定ユーザーの登録データを取得する関数
CREATE OR REPLACE FUNCTION get_user_collection_entries_admin(target_user_id uuid)
RETURNS TABLE (
  id uuid,
  photo_url text,
  drinking_date date,
  rating smallint,
  memo text,
  created_at timestamptz,
  alcohol_id uuid,
  alcohol_name text,
  alcohol_type text,
  alcohol_subtype text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 管理者チェック
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;
  
  RETURN QUERY
  SELECT 
    ce.id,
    ce.photo_url,
    ce.drinking_date,
    ce.rating,
    ce.memo,
    ce.created_at,
    ce.alcohol_id,
    a.name AS alcohol_name,
    a.type AS alcohol_type,
    a.subtype AS alcohol_subtype
  FROM public.collection_entries ce
  LEFT JOIN public.alcohols a ON ce.alcohol_id = a.id
  WHERE ce.user_id = target_user_id
  ORDER BY ce.created_at DESC;
END;
$$;

-- 管理者ページ用：全プロフィールを取得する関数
CREATE OR REPLACE FUNCTION get_all_profiles_admin()
RETURNS TABLE (
  id uuid,
  display_name text,
  is_admin boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 管理者チェック
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.display_name,
    p.is_admin,
    p.created_at
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;;
