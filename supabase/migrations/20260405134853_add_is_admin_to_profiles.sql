-- profilesテーブルにis_adminカラムを追加
ALTER TABLE public.profiles
ADD COLUMN is_admin boolean NOT NULL DEFAULT false;

-- notsuka0217@gmail.com を管理者に設定
UPDATE public.profiles
SET is_admin = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'notsuka0217@gmail.com');

-- 管理者が全ユーザーのcollection_entriesを閲覧できるRLSポリシーを追加
CREATE POLICY "Admins can view all collection entries"
ON public.collection_entries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- 管理者が全ユーザーのprofilesを閲覧できるRLSポリシーを追加
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- 管理者が全alcoholsを閲覧できるRLSポリシーを追加（既存ポリシーがあれば不要かもしれないが念のため）
CREATE POLICY "Admins can view all alcohols"
ON public.alcohols
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);;
