"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState, useRef, useEffect } from "react";

// ソートオプション
const SORT_OPTIONS = [
  { label: "追加日順", value: "created_at", icon: "📅" },
  { label: "評価順", value: "rating", icon: "⭐" },
  { label: "飲んだ日順", value: "drinking_date", icon: "🍶" },
] as const;

// 種類オプション（alcohol-form.tsx と同期）
const TYPE_OPTIONS = [
  { label: "すべて", value: "" },
  { label: "日本酒", value: "日本酒" },
  { label: "ワイン", value: "ワイン" },
  { label: "ビール", value: "ビール" },
  { label: "ウイスキー", value: "ウイスキー" },
  { label: "焼酎", value: "焼酎" },
  { label: "ブランデー", value: "ブランデー" },
  { label: "ジン", value: "ジン" },
  { label: "ラム", value: "ラム" },
  { label: "テキーラ", value: "テキーラ" },
  { label: "リキュール", value: "リキュール" },
  { label: "その他", value: "その他" },
] as const;

// 評価オプション
const RATING_OPTIONS = [
  { label: "すべて", value: "" },
  { label: "★1以上", value: "1" },
  { label: "★2以上", value: "2" },
  { label: "★3以上", value: "3" },
  { label: "★4以上", value: "4" },
  { label: "★5のみ", value: "5" },
] as const;

type DropdownType = "sort" | "type" | "rating" | null;

export function ShelfFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [openDropdown, setOpenDropdown] = useState<DropdownType>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 現在の値を取得
  const currentSort = searchParams.get("sort") || "created_at";
  const currentType = searchParams.get("type") || "";
  const currentMinRating = searchParams.get("minRating") || "";

  // フィルタが適用されているか
  const hasFilters = currentType !== "" || currentMinRating !== "";

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // URLパラメータを更新
  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
      setOpenDropdown(null);
    },
    [router, pathname, searchParams]
  );

  // フィルタをクリア
  const clearFilters = useCallback(() => {
    const params = new URLSearchParams();
    // ソートは維持
    if (currentSort !== "created_at") {
      params.set("sort", currentSort);
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, currentSort]);

  // ソートラベルを取得
  const getSortLabel = () => {
    const option = SORT_OPTIONS.find((o) => o.value === currentSort);
    return option ? `${option.icon} ${option.label}` : "追加日順";
  };

  // 種類ラベルを取得
  const getTypeLabel = () => {
    if (!currentType) return "種類";
    return currentType;
  };

  // 評価ラベルを取得
  const getRatingLabel = () => {
    if (!currentMinRating) return "評価";
    const option = RATING_OPTIONS.find((o) => o.value === currentMinRating);
    return option?.label || "評価";
  };

  return (
    <div
      ref={containerRef}
      className="sticky top-[73px] z-30 bg-background/95 backdrop-blur-sm border-b border-border-light px-4 py-2 overflow-visible"
    >
      <div className="flex items-center gap-2 overflow-x-clip overflow-y-visible scrollbar-hide">
        {/* ソートドロップダウン */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() =>
              setOpenDropdown(openDropdown === "sort" ? null : "sort")
            }
            className={`
              flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium
              border transition-all duration-200
              ${
                openDropdown === "sort"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-muted text-foreground hover:border-primary/50"
              }
            `}
          >
            <span>{getSortLabel()}</span>
            <ChevronDownIcon
              className={`w-3.5 h-3.5 transition-transform ${openDropdown === "sort" ? "rotate-180" : ""}`}
            />
          </button>

          {openDropdown === "sort" && (
            <div className="absolute top-full left-0 mt-1 w-40 bg-muted border border-border rounded-lg shadow-lg overflow-hidden z-50 animate-in fade-in scale-in">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateParams("sort", option.value)}
                  className={`
                    w-full px-3 py-2.5 text-left text-sm flex items-center gap-2
                    transition-colors
                    ${
                      currentSort === option.value
                        ? "bg-gold/10 text-gold font-medium"
                        : "hover:bg-background text-foreground"
                    }
                  `}
                >
                  <span>{option.icon}</span>
                  <span>{option.label}</span>
                  {currentSort === option.value && (
                    <CheckIcon className="w-4 h-4 ml-auto text-gold" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 種類ドロップダウン */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() =>
              setOpenDropdown(openDropdown === "type" ? null : "type")
            }
            className={`
              flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium
              border transition-all duration-200
              ${
                currentType
                  ? "border-gold bg-gold/10 text-gold"
                  : openDropdown === "type"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-muted text-foreground hover:border-primary/50"
              }
            `}
          >
            <span>{getTypeLabel()}</span>
            <ChevronDownIcon
              className={`w-3.5 h-3.5 transition-transform ${openDropdown === "type" ? "rotate-180" : ""}`}
            />
          </button>

          {openDropdown === "type" && (
            <div className="absolute top-full left-0 mt-1 w-36 bg-muted border border-border rounded-lg shadow-lg overflow-y-auto max-h-64 z-[60] animate-in fade-in scale-in">
              {TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateParams("type", option.value)}
                  className={`
                    w-full px-3 py-2.5 text-left text-sm flex items-center gap-2
                    transition-colors
                    ${
                      currentType === option.value
                        ? "bg-gold/10 text-gold font-medium"
                        : "hover:bg-background text-foreground"
                    }
                  `}
                >
                  <span>{option.label}</span>
                  {currentType === option.value && (
                    <CheckIcon className="w-4 h-4 ml-auto text-gold" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 評価ドロップダウン */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() =>
              setOpenDropdown(openDropdown === "rating" ? null : "rating")
            }
            className={`
              flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium
              border transition-all duration-200
              ${
                currentMinRating
                  ? "border-gold bg-gold/10 text-gold"
                  : openDropdown === "rating"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-muted text-foreground hover:border-primary/50"
              }
            `}
          >
            <span>{getRatingLabel()}</span>
            <ChevronDownIcon
              className={`w-3.5 h-3.5 transition-transform ${openDropdown === "rating" ? "rotate-180" : ""}`}
            />
          </button>

          {openDropdown === "rating" && (
            <div className="absolute top-full left-0 mt-1 w-32 bg-muted border border-border rounded-lg shadow-lg overflow-hidden z-50 animate-in fade-in scale-in">
              {RATING_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateParams("minRating", option.value)}
                  className={`
                    w-full px-3 py-2.5 text-left text-sm flex items-center gap-2
                    transition-colors
                    ${
                      currentMinRating === option.value
                        ? "bg-gold/10 text-gold font-medium"
                        : "hover:bg-background text-foreground"
                    }
                  `}
                >
                  <span>{option.label}</span>
                  {currentMinRating === option.value && (
                    <CheckIcon className="w-4 h-4 ml-auto text-gold" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* フィルタクリアボタン */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex-shrink-0 flex items-center gap-1 px-2.5 py-2 rounded-full text-xs text-muted-foreground hover:text-vermilion hover:bg-vermilion/10 transition-colors"
          >
            <XIcon className="w-3.5 h-3.5" />
            <span>クリア</span>
          </button>
        )}
      </div>
    </div>
  );
}

// アイコンコンポーネント
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}
