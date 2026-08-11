"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      // OS設定への自動追従はアプリの見た目に影響するため、意図的にライト固定とする
      // （ダークモード切替はヘッダーのHeaderActions UIから手動で行う）
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
