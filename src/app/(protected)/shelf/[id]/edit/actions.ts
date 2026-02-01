"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type UpdateCollectionParams = {
  entryId: string;
  photoUrl: string | null;
  oldPhotoUrl: string | null;
  drinkingDate: string;
  rating: number;
  memo: string;
};

type DeleteCollectionParams = {
  entryId: string;
  photoUrl: string | null;
};

/**
 * photo_url から Storage のパスを抽出
 * 例: https://xxx.supabase.co/storage/v1/object/public/photos/user_id/123.jpg
 *  → "user_id/123.jpg"
 */
function extractStoragePath(photoUrl: string): string {
  try {
    const url = new URL(photoUrl);
    const parts = url.pathname.split("/photos/");
    return parts[1] || "";
  } catch {
    return "";
  }
}

/**
 * コレクションエントリを更新
 */
export async function updateCollection(params: UpdateCollectionParams) {
  const supabase = await createClient();

  // ユーザー確認
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("認証が必要です");
  }

  const { entryId, photoUrl, oldPhotoUrl, drinkingDate, rating, memo } = params;

  // collection_entries を UPDATE
  const { error: updateError } = await supabase
    .from("collection_entries")
    .update({
      photo_url: photoUrl,
      drinking_date: drinkingDate || null,
      rating,
      memo: memo || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId)
    .eq("user_id", user.id); // RLSに加えて明示的にチェック

  if (updateError) {
    console.error("Failed to update collection entry:", updateError);
    throw new Error("コレクションの更新に失敗しました");
  }

  // 写真が変更された場合、古い画像を Storage から削除
  if (oldPhotoUrl && oldPhotoUrl !== photoUrl) {
    const storagePath = extractStoragePath(oldPhotoUrl);
    if (storagePath) {
      const { error: deleteError } = await supabase.storage
        .from("photos")
        .remove([storagePath]);

      if (deleteError) {
        // 削除失敗はログに記録するが、処理は続行
        console.error("Failed to delete old photo:", deleteError);
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

  // ユーザー確認
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("認証が必要です");
  }

  const { entryId, photoUrl } = params;

  // collection_entries を DELETE
  const { error: deleteError } = await supabase
    .from("collection_entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", user.id); // RLSに加えて明示的にチェック

  if (deleteError) {
    console.error("Failed to delete collection entry:", deleteError);
    throw new Error("コレクションの削除に失敗しました");
  }

  // Storage から画像を削除
  if (photoUrl) {
    const storagePath = extractStoragePath(photoUrl);
    if (storagePath) {
      const { error: storageError } = await supabase.storage
        .from("photos")
        .remove([storagePath]);

      if (storageError) {
        // 削除失敗はログに記録するが、処理は続行
        console.error("Failed to delete photo from storage:", storageError);
      }
    }
  }

  redirect("/shelf");
}
