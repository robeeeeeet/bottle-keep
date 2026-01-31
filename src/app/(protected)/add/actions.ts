"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { AlcoholInfo } from "@/lib/gemini/analyze";

type SaveCollectionParams = {
  alcoholInfo: AlcoholInfo;
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

  const { alcoholInfo, photoUrl, drinkingDate, rating, memo } = params;

  // 1. alcoholsテーブルにお酒情報を保存
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

  // 2. collection_entriesにユーザーのコレクションを保存
  const { error: entryError } = await supabase.from("collection_entries").insert({
    user_id: user.id,
    alcohol_id: alcohol.id,
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
