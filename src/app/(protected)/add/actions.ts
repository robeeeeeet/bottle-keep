"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { AlcoholInfo } from "@/lib/gemini/analyze";

/**
 * 既存のお酒情報をIDで取得
 * （フレンドのお酒に「自分も評価する」ときに使用）
 */
export async function getAlcoholById(
  alcoholId: string
): Promise<AlcoholInfo | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("alcohols")
    .select(
      `
      id,
      name,
      type,
      subtype,
      brand,
      producer,
      origin_country,
      origin_region,
      alcohol_percentage,
      price_range,
      characteristics
    `
    )
    .eq("id", alcoholId)
    .single();

  if (error || !data) {
    console.error("Failed to get alcohol:", error);
    return null;
  }

  // AlcoholInfo形式に変換
  return {
    name: data.name,
    type: data.type,
    subtype: data.subtype || undefined,
    brand: data.brand || undefined,
    producer: data.producer || undefined,
    origin_country: data.origin_country || undefined,
    origin_region: data.origin_region || undefined,
    alcohol_percentage: data.alcohol_percentage || undefined,
    price_range: data.price_range || undefined,
    characteristics: data.characteristics || undefined,
  };
}

type SaveCollectionParams = {
  alcoholInfo: AlcoholInfo;
  existingAlcoholId?: string | null; // 既存のお酒に追加する場合のID（フレンドのお酒にレビュー追加時）
  photoUrl?: string | null;
  drinkingDate: string;
  rating: number;
  memo: string;
};

export async function saveCollection(params: SaveCollectionParams) {
  const supabase = await createClient();

  // ユーザー確認
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("認証が必要です");
  }

  const { alcoholInfo, existingAlcoholId, photoUrl, drinkingDate, rating, memo } = params;

  let alcoholId: string;

  // 既存のお酒にレビューを追加する場合はそのIDを使用
  if (existingAlcoholId) {
    console.log("Adding review to existing alcohol ID:", existingAlcoholId);
    alcoholId = existingAlcoholId;
  } else {
    // 新規のお酒を登録
    const { data: alcohol, error: alcoholError } = await supabase
      .from("alcohols")
      .insert({
        name: alcoholInfo.name,
        type: alcoholInfo.type,
        subtype: alcoholInfo.subtype || null,
        brand: alcoholInfo.brand || null,
        producer: alcoholInfo.producer || null,
        origin_country: alcoholInfo.origin_country || null,
        origin_region: alcoholInfo.origin_region || null,
        alcohol_percentage: alcoholInfo.alcohol_percentage || null,
        price_range: alcoholInfo.price_range || null,
        characteristics: alcoholInfo.characteristics || null,
        raw_llm_response: alcoholInfo, // 元のレスポンスを保存
      })
      .select("id")
      .single();

    if (alcoholError) {
      console.error("Failed to save alcohol:", alcoholError);
      throw new Error("お酒情報の保存に失敗しました");
    }

    alcoholId = alcohol.id;
  }

  // 2. collection_entriesにユーザーのコレクションを保存
  const { error: entryError } = await supabase.from("collection_entries").insert({
    user_id: user.id,
    alcohol_id: alcoholId,
    photo_url: photoUrl || null,
    drinking_date: drinkingDate || null,
    rating,
    memo: memo || null,
  });

  if (entryError) {
    console.error("Failed to save collection entry:", entryError);
    throw new Error("コレクションの保存に失敗しました");
  }

  // 棚ページにリダイレクト
  redirect("/shelf");
}
