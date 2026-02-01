"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import type { AlcoholInfo } from "@/lib/gemini/analyze";

type Props = {
  alcoholInfo: AlcoholInfo;
  photoUrl?: string | null;
  onSave: (data: ReviewData) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
};

export type ReviewData = {
  alcoholInfo: AlcoholInfo;
  photoUrl?: string | null;
  drinkingDate: string;
  rating: number;
  memo: string;
};

export function ReviewForm({ alcoholInfo, photoUrl, onSave, isLoading, submitLabel = "棚に追加する" }: Props) {
  const [drinkingDate, setDrinkingDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [rating, setRating] = useState(0);
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const starsContainerRef = useRef<HTMLDivElement>(null);

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

    try {
      await onSave({
        alcoholInfo,
        photoUrl,
        drinkingDate,
        rating,
        memo,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* お酒情報カード */}
      <div className="bg-muted rounded-lg border-l-4 border-primary p-4 shadow-sm">
        <div className="flex gap-4">
          {photoUrl ? (
            <div className="w-20 h-20 relative rounded-lg overflow-hidden flex-shrink-0 border border-border">
              <Image
                src={photoUrl}
                alt={alcoholInfo.name}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-3xl">🍶</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg truncate">{alcoholInfo.name}</h3>
            <p className="text-sm text-muted-foreground">
              {alcoholInfo.type}
              {alcoholInfo.subtype && ` / ${alcoholInfo.subtype}`}
            </p>
            {alcoholInfo.origin_country && (
              <p className="text-sm text-muted-foreground">
                {alcoholInfo.origin_country}
                {alcoholInfo.origin_region && ` ${alcoholInfo.origin_region}`}
              </p>
            )}
            {alcoholInfo.alcohol_percentage && (
              <p className="text-sm text-muted-foreground">
                {alcoholInfo.alcohol_percentage}%
              </p>
            )}
          </div>
        </div>

        {/* 特徴タグ */}
        {alcoholInfo.characteristics && alcoholInfo.characteristics.length > 0 && (
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
        <p className="text-xs text-muted-foreground mt-1">タップまたはスライドで選択</p>
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
        disabled={isLoading || rating === 0}
        className="w-full py-3 px-4 rounded-lg bg-gradient-to-b from-primary to-primary/90 text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
      >
        {isLoading ? (
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
          submitLabel
        )}
      </button>
    </form>
  );
}
