"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { compressAndConvertToBase64 } from "@/lib/image/compressor";
import { updateCollection, deleteCollection } from "../edit/actions";
import { DeleteModal } from "./delete-modal";
import type { CollectionEntryWithAlcohol } from "../edit/page";

type Props = {
  entry: CollectionEntryWithAlcohol;
};

export function EditForm({ entry }: Props) {
  const [drinkingDate, setDrinkingDate] = useState(
    entry.drinking_date || new Date().toISOString().split("T")[0]
  );
  const [rating, setRating] = useState(entry.rating || 0);
  const [memo, setMemo] = useState(entry.memo || "");
  const [photoUrl, setPhotoUrl] = useState(entry.photo_url);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const starsContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const alcoholInfo = entry.alcohols;

  // 写真選択ハンドラー
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック（20MB以下）
    if (file.size > 20 * 1024 * 1024) {
      setError("ファイルサイズは20MB以下にしてください");
      return;
    }

    // 画像タイプチェック
    const isImage = file.type.startsWith("image/") || /\.(heic|heif)$/i.test(file.name);
    if (!isImage) {
      setError("画像ファイルを選択してください");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      // 圧縮・変換
      const result = await compressAndConvertToBase64(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.8,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      // プレビュー表示
      const previewUrl = `data:${result.mimeType};base64,${result.base64}`;
      setPhotoPreview(previewUrl);

      // Supabase Storage にアップロード
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("ログインが必要です");

      // Base64 から Blob を作成
      const response = await fetch(previewUrl);
      const blob = await response.blob();

      // ファイル名を生成
      const fileName = `${user.id}/${Date.now()}.jpg`;

      // アップロード
      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(fileName, blob, {
          cacheControl: "3600",
          upsert: false,
          contentType: "image/jpeg",
        });

      if (uploadError) throw uploadError;

      // 公開URLを取得
      const { data: { publicUrl } } = supabase.storage.from("photos").getPublicUrl(fileName);

      setPhotoUrl(publicUrl);
      setPhotoPreview(null);
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "アップロードに失敗しました");
      setPhotoPreview(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // タッチ位置から星の番号を計算
  const getRatingFromTouch = (clientX: number): number => {
    const container = starsContainerRef.current;
    if (!container) return 0;

    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const starWidth = rect.width / 5;
    const starNumber = Math.ceil(x / starWidth);
    return Math.max(1, Math.min(5, starNumber));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const newRating = getRatingFromTouch(touch.clientX);
    setRating(newRating);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const newRating = getRatingFromTouch(touch.clientX);
    setRating(newRating);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rating === 0) {
      setError("評価を選択してください");
      return;
    }

    setIsSaving(true);

    try {
      await updateCollection({
        entryId: entry.id,
        photoUrl,
        oldPhotoUrl: entry.photo_url,
        drinkingDate,
        rating,
        memo,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      await deleteCollection({
        entryId: entry.id,
        photoUrl: entry.photo_url,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* お酒情報カード */}
        <div className="bg-muted rounded-lg border-l-4 border-primary p-4 shadow-sm">
          <div className="flex gap-4">
            {/* 写真エリア（タップで変更可能） */}
            <label className="relative cursor-pointer group flex-shrink-0">
              {isUploading ? (
                <div className="w-20 h-20 rounded-lg bg-primary/10 flex items-center justify-center border border-border">
                  <svg
                    className="animate-spin w-6 h-6 text-primary"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </div>
              ) : photoPreview || photoUrl ? (
                <div className="w-20 h-20 relative rounded-lg overflow-hidden border border-border">
                  <Image
                    src={photoPreview || photoUrl || ""}
                    alt={alcoholInfo?.name || "お酒の写真"}
                    fill
                    className="object-cover"
                  />
                  {/* 変更オーバーレイ */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-lg bg-primary/10 flex items-center justify-center border border-dashed border-primary/30 group-hover:border-primary transition-colors">
                  <svg
                    className="w-6 h-6 text-primary/60"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
                disabled={isUploading || isSaving}
              />
            </label>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg truncate">
                {alcoholInfo?.name || "名称未設定"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {alcoholInfo?.type}
                {alcoholInfo?.subtype && ` / ${alcoholInfo.subtype}`}
              </p>
              {alcoholInfo?.origin_country && (
                <p className="text-sm text-muted-foreground">
                  {alcoholInfo.origin_country}
                  {alcoholInfo.origin_region && ` ${alcoholInfo.origin_region}`}
                </p>
              )}
              {alcoholInfo?.alcohol_percentage && (
                <p className="text-sm text-muted-foreground">
                  {alcoholInfo.alcohol_percentage}%
                </p>
              )}
            </div>
          </div>

          {/* 特徴タグ */}
          {alcoholInfo?.characteristics &&
            alcoholInfo.characteristics.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {alcoholInfo.characteristics.map((char, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 bg-accent/10 text-accent rounded-full"
                  >
                    {char}
                  </span>
                ))}
              </div>
            )}
        </div>

        {/* 飲んだ日 */}
        <div>
          <label htmlFor="drinkingDate" className="block text-sm font-medium mb-2">
            飲んだ日
          </label>
          <input
            id="drinkingDate"
            type="date"
            value={drinkingDate}
            onChange={(e) => setDrinkingDate(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-muted border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* 星評価（タップ＆スライド対応） */}
        <div>
          <label className="block text-sm font-medium mb-2">
            評価 <span className="text-red-500">*</span>
          </label>
          <div
            ref={starsContainerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            className="flex touch-none select-none"
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`text-3xl px-2 py-1 transition-transform hover:scale-110 active:scale-95 ${
                  star <= rating ? "text-gold" : "text-border"
                }`}
              >
                ★
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            タップまたはスライドで選択
          </p>
        </div>

        {/* メモ */}
        <div>
          <label htmlFor="memo" className="block text-sm font-medium mb-2">
            ひとことメモ
          </label>
          <textarea
            id="memo"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="味の感想、飲んだシチュエーションなど..."
            rows={3}
            className="w-full px-4 py-3 rounded-lg bg-muted border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* 保存ボタン */}
        <button
          type="submit"
          disabled={isSaving || rating === 0}
          className="w-full py-3 px-4 rounded-lg bg-gradient-to-b from-primary to-primary/90 text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
        >
          {isSaving ? (
            <>
              <svg
                className="animate-spin w-5 h-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              保存中...
            </>
          ) : (
            "変更を保存"
          )}
        </button>

        {/* 削除ボタン */}
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="w-full py-3 px-4 rounded-lg border border-red-300 text-red-600 font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          このお酒を削除
        </button>
      </form>

      {/* 削除確認モーダル */}
      <DeleteModal
        isOpen={showDeleteModal}
        alcoholName={alcoholInfo?.name || "このお酒"}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
        isDeleting={isDeleting}
      />
    </>
  );
}
