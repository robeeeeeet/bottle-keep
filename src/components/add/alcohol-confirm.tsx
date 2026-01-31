"use client";

import type { AlcoholInfo } from "@/lib/gemini/analyze";

type Props = {
  alcoholInfo: AlcoholInfo;
  onConfirm: () => void;
  onReject: () => void;
};

export function AlcoholConfirm({ alcoholInfo, onConfirm, onReject }: Props) {
  return (
    <div className="space-y-6">
      <p className="text-foreground/60">
        この銘柄で合っていますか？
      </p>

      {/* お酒情報カード */}
      <div className="bg-foreground/5 rounded-xl p-4">
        <div className="flex gap-4">
          <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">🍶</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg">{alcoholInfo.name}</h3>
            <p className="text-sm text-foreground/60">
              {alcoholInfo.type}
              {alcoholInfo.subtype && ` / ${alcoholInfo.subtype}`}
            </p>
            {alcoholInfo.origin_country && (
              <p className="text-sm text-foreground/60">
                {alcoholInfo.origin_country}
                {alcoholInfo.origin_region && ` ${alcoholInfo.origin_region}`}
              </p>
            )}
            {alcoholInfo.alcohol_percentage && (
              <p className="text-sm text-foreground/60">
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
                className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full"
              >
                {char}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ボタン */}
      <div className="flex gap-3">
        <button
          onClick={onReject}
          className="flex-1 py-3 px-4 rounded-xl border border-foreground/20 font-medium hover:bg-foreground/5 transition-colors"
        >
          違う
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-3 px-4 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
        >
          合っている
        </button>
      </div>

      <p className="text-xs text-foreground/40 text-center">
        違う場合は戻って銘柄名を詳しく入力してください
      </p>
    </div>
  );
}
