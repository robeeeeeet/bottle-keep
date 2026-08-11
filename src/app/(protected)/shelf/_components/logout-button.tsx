"use client";

import { useCallback, useTransition } from "react";
import { logout } from "@/app/(auth)/actions/auth";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  // 誤タップ防止のため確認を挟む
  const handleClick = useCallback(() => {
    if (!window.confirm("ログアウトしますか？")) {
      return;
    }
    startTransition(async () => {
      await logout();
    });
  }, []);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-2 rounded-lg hover:bg-muted disabled:opacity-50"
      title="ログアウト"
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        />
      </svg>
    </button>
  );
}
