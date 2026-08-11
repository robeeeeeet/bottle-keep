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

// 入力値の上限
const NAME_MAX_LENGTH = 200;
const TYPE_MAX_LENGTH = 50;
const MEMO_MAX_LENGTH = 1000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// JST（アプリの想定タイムゾーン）での今日の日付をYYYY-MM-DD形式で取得
function getTodayString(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// 実在する日付かどうかを判定（例: 2026-02-30 を弾く）
function isRealDate(dateString: string): boolean {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * クライアントから渡された値を検証する
 * @returns エラーメッセージ（問題がなければnull）
 */
function validateSaveCollectionParams(
  params: SaveCollectionParams
): string | null {
  const { alcoholInfo, drinkingDate, rating, memo } = params;

  // お酒情報
  if (!alcoholInfo) {
    return "お酒の情報が不正です";
  }
  const name = (alcoholInfo.name ?? "").trim();
  const type = (alcoholInfo.type ?? "").trim();
  if (!name) {
    return "銘柄名は必須です";
  }
  if (name.length > NAME_MAX_LENGTH) {
    return `銘柄名は${NAME_MAX_LENGTH}文字以内で入力してください`;
  }
  if (!type) {
    return "お酒の種類は必須です";
  }
  if (type.length > TYPE_MAX_LENGTH) {
    return `お酒の種類は${TYPE_MAX_LENGTH}文字以内で入力してください`;
  }

  // 評価（1〜5の整数）
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return "評価は1〜5で選択してください";
  }

  // 飲んだ日（YYYY-MM-DD形式・未来日は不可。未入力は許容）
  if (drinkingDate) {
    if (!DATE_PATTERN.test(drinkingDate) || !isRealDate(drinkingDate)) {
      return "飲んだ日の形式が正しくありません";
    }
    if (drinkingDate > getTodayString()) {
      return "飲んだ日に未来の日付は指定できません";
    }
  }

  // メモ
  if (memo && memo.length > MEMO_MAX_LENGTH) {
    return `メモは${MEMO_MAX_LENGTH}文字以内で入力してください`;
  }

  return null;
}

export async function saveCollection(
  params: SaveCollectionParams
): Promise<{ error: string } | undefined> {
  const supabase = await createClient();

  // ユーザー確認
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("認証が必要です");
  }

  // 入力値の検証（失敗時はredirectせずエラーを返す）
  const validationError = validateSaveCollectionParams(params);
  if (validationError) {
    return { error: validationError };
  }

  const { alcoholInfo, photoUrl, drinkingDate, rating, memo } = params;
  const name = alcoholInfo.name.trim();
  const type = alcoholInfo.type.trim();
  const trimmedMemo = memo?.trim() || null;

  let alcoholId: string;

  {
    // お酒マスターに登録
    const { data: alcohol, error: alcoholError } = await supabase
      .from("alcohols")
      .insert({
        name,
        type,
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
    memo: trimmedMemo,
  });

  if (entryError) {
    console.error("Failed to save collection entry:", entryError);
    throw new Error("コレクションの保存に失敗しました");
  }

  // 棚ページにリダイレクト
  redirect("/shelf");
}
