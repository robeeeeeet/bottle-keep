"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type UpdateCollectionParams = {
  entryId: string;
  photoUrl: string | null;
  drinkingDate: string;
  rating: number;
  memo: string;
};

type DeleteCollectionParams = {
  entryId: string;
};

const PHOTOS_PUBLIC_PREFIX = "/storage/v1/object/public/photos/";

/**
 * photo_url から Storage のパスを抽出
 * 例: https://xxx.supabase.co/storage/v1/object/public/photos/user_id/123.jpg
 *  → "user_id/123.jpg"
 *
 * ホスト名・パスのプレフィックス・先頭セグメント（= 所有ユーザーID）を検証し、
 * 自分以外のファイルを指すURLは "" を返す（細工URLによる他人のファイル削除を防止）
 */
function extractStoragePath(photoUrl: string, userId: string): string {
  try {
    const url = new URL(photoUrl);
    const expectedHostname = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!)
      .hostname;

    if (url.hostname !== expectedHostname) {
      console.warn("[extractStoragePath] Unexpected host:", url.hostname);
      return "";
    }

    if (!url.pathname.startsWith(PHOTOS_PUBLIC_PREFIX)) {
      console.warn("[extractStoragePath] Unexpected path:", url.pathname);
      return "";
    }

    const path = decodeURIComponent(
      url.pathname.slice(PHOTOS_PUBLIC_PREFIX.length)
    );

    // 先頭セグメントは所有ユーザーIDでなければならない
    if (!path || path.split("/")[0] !== userId || path.includes("..")) {
      console.warn("[extractStoragePath] Path is not owned by user:", path);
      return "";
    }

    return path;
  } catch (err) {
    console.warn("[extractStoragePath] Failed to parse URL:", photoUrl, err);
    return "";
  }
}

/**
 * コレクションエントリを更新
 */
export async function updateCollection(params: UpdateCollectionParams) {
  const supabase = await createClient();

  // ユーザー確認（JWTのローカル検証）
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) {
    throw new Error("認証が必要です");
  }

  const { entryId, photoUrl, drinkingDate, rating, memo } = params;

  // 自分のエントリであることを確認し、旧写真URLはDBの値を使う
  // （クライアントから渡されたURLを信用しない）
  const { data: existing, error: fetchError } = await supabase
    .from("collection_entries")
    .select("photo_url")
    .eq("id", entryId)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) {
    console.error("Failed to load collection entry:", fetchError);
    throw new Error("コレクションの更新に失敗しました");
  }

  if (!existing) {
    throw new Error("権限がありません");
  }

  const oldPhotoUrl: string | null = existing.photo_url;

  // 新しく指定された写真URLは自分のStorageパスを指している必要がある
  if (
    photoUrl &&
    photoUrl !== oldPhotoUrl &&
    !extractStoragePath(photoUrl, userId)
  ) {
    throw new Error("不正な写真URLです");
  }

  // collection_entries を UPDATE
  const { data: updated, error: updateError } = await supabase
    .from("collection_entries")
    .update({
      photo_url: photoUrl,
      drinking_date: drinkingDate || null,
      rating,
      memo: memo || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId)
    .eq("user_id", userId) // RLSに加えて明示的にチェック
    .select("id");

  if (updateError) {
    console.error("Failed to update collection entry:", updateError);
    throw new Error("コレクションの更新に失敗しました");
  }

  // 0行更新（他人のエントリ・存在しないID）は成功扱いにしない
  if (!updated || updated.length === 0) {
    throw new Error("権限がありません");
  }

  // 写真が変更された場合、古い画像を Storage から削除
  if (oldPhotoUrl && oldPhotoUrl !== photoUrl) {
    const storagePath = extractStoragePath(oldPhotoUrl, userId);
    if (storagePath) {
      const { error: deleteError } = await supabase.storage
        .from("photos")
        .remove([storagePath]);

      if (deleteError) {
        // 削除失敗は警告ログに記録（孤児ファイルになる可能性あり）
        // TODO: 定期クリーンアップジョブで対応を検討
        console.warn(
          "[updateCollection] Failed to delete old photo (orphan file may remain):",
          { storagePath, error: deleteError }
        );
      }
    }
  }

  redirect("/shelf");
}

/**
 * コレクションエントリを削除
 */
export async function deleteCollection(params: DeleteCollectionParams) {
  const supabase = await createClient();

  // ユーザー確認（JWTのローカル検証）
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) {
    throw new Error("認証が必要です");
  }

  const { entryId } = params;

  // collection_entries を DELETE
  // 削除された行から photo_url を受け取る（クライアント指定のURLは信用しない）
  const { data: deleted, error: deleteError } = await supabase
    .from("collection_entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", userId) // RLSに加えて明示的にチェック
    .select("id, photo_url");

  if (deleteError) {
    console.error("Failed to delete collection entry:", deleteError);
    throw new Error("コレクションの削除に失敗しました");
  }

  // 0行削除（他人のエントリ・存在しないID）は成功扱いにしない
  if (!deleted || deleted.length === 0) {
    throw new Error("権限がありません");
  }

  const photoUrl: string | null = deleted[0].photo_url;

  // Storage から画像を削除
  if (photoUrl) {
    const storagePath = extractStoragePath(photoUrl, userId);
    if (storagePath) {
      const { error: storageError } = await supabase.storage
        .from("photos")
        .remove([storagePath]);

      if (storageError) {
        // 削除失敗は警告ログに記録（孤児ファイルになる可能性あり）
        // TODO: 定期クリーンアップジョブで対応を検討
        console.warn(
          "[deleteCollection] Failed to delete photo from storage (orphan file may remain):",
          { storagePath, error: storageError }
        );
      }
    }
  }

  redirect("/shelf");
}
