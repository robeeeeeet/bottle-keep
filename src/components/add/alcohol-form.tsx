"use client";

import { useState } from "react";

type Props = {
  onSubmit: (name: string, type: string) => void;
};

const ALCOHOL_TYPES = [
  { value: "日本酒", label: "日本酒" },
  { value: "ワイン", label: "ワイン" },
  { value: "ビール", label: "ビール" },
  { value: "ウイスキー", label: "ウイスキー" },
  { value: "焼酎", label: "焼酎" },
  { value: "ブランデー", label: "ブランデー" },
  { value: "ジン", label: "ジン" },
  { value: "ラム", label: "ラム" },
  { value: "テキーラ", label: "テキーラ" },
  { value: "リキュール", label: "リキュール" },
  { value: "その他", label: "その他" },
];

export function AlcoholForm({ onSubmit }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !type) {
      setError("銘柄名と種類を入力してください");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      onSubmit(name.trim(), type);
    } catch (err) {
      console.error("Form error:", err);
      setError("エラーが発生しました");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 種類選択 */}
      <div>
        <label className="block text-sm font-medium mb-2">
          お酒の種類 <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {ALCOHOL_TYPES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setType(item.value)}
              className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                type === item.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted border border-border hover:border-primary/40"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 銘柄名入力 */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-2">
          銘柄名 <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: 獺祭 純米大吟醸 磨き二割三分"
          className="w-full px-4 py-3 rounded-lg bg-muted border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          AIが詳細情報を自動で取得します
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* 送信ボタン */}
      <button
        type="submit"
        disabled={loading || !name.trim() || !type}
        className="w-full py-3 px-4 rounded-lg bg-gradient-to-b from-primary to-primary/90 text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
      >
        {loading ? (
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
            情報を取得中...
          </>
        ) : (
          "次へ"
        )}
      </button>
    </form>
  );
}
