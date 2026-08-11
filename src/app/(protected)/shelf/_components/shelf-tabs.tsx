"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

const TABS = [
  { value: "mine", label: "自分" },
  { value: "following", label: "フォロー中" },
] as const;

/**
 * 棚の「自分 / フォロー中」タブ。
 * URLパラメータ（?tab=）で状態を持つため、サーバー側で取得内容を切り替えられる。
 */
export function ShelfTabs({ activeTab }: { activeTab: "mine" | "following" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const switchTab = useCallback(
    (tab: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "mine") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const queryString = params.toString();
      router.push(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    },
    [router, pathname, searchParams]
  );

  return (
    <div
      role="tablist"
      aria-label="表示する投稿"
      className="flex border-b border-border-light"
    >
      {TABS.map((tab) => {
        const isActive = tab.value === activeTab;
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={isActive}
            onClick={() => switchTab(tab.value)}
            className={`
              flex-1 py-3 text-sm font-medium transition-colors relative
              ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}
            `}
          >
            {tab.label}
            {isActive && (
              <span
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent"
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
