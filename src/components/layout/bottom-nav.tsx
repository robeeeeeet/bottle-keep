"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/shelf",
    label: "棚",
    // 盃と棚をモチーフにしたアイコン
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-6 h-6"
      >
        {/* 棚板 */}
        <path d="M3 8h18" />
        <path d="M3 16h18" />
        {/* 棚の支柱 */}
        <path d="M6 4v16" />
        <path d="M18 4v16" />
        {/* 徳利シルエット */}
        <path d="M10 10v2c0 1 1 2 2 2s2-1 2-2v-2" />
        <circle cx="12" cy="9.5" r="0.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/add",
    label: "追加",
    // 徳利にプラスマーク
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-6 h-6"
      >
        {/* 徳利 */}
        <path d="M9 6c0-1 1-2 3-2s3 1 3 2" />
        <path d="M9 6v2c0 0.5-1 1-1 3v6c0 1.5 1.5 3 4 3s4-1.5 4-3v-6c0-2-1-2.5-1-3V6" />
        {/* プラスマーク */}
        <path d="M12 11v4" strokeWidth={2} />
        <path d="M10 13h4" strokeWidth={2} />
      </svg>
    ),
  },
  {
    href: "/shared",
    label: "共有",
    // 人と人をつなぐアイコン
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-6 h-6"
      >
        {/* 左の人 */}
        <circle cx="7" cy="7" r="2" />
        <path d="M5 14a4 4 0 014-4h0" />
        {/* 右の人 */}
        <circle cx="17" cy="7" r="2" />
        <path d="M15 14a4 4 0 014-4h0" />
        {/* つながり */}
        <path d="M9 12h6" />
        <path d="M12 10v4" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 nav-japanese pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                relative flex flex-col items-center justify-center w-full h-full gap-1
                transition-all duration-300
                ${
                  isActive
                    ? "text-gold nav-item-active"
                    : "text-primary-foreground/60 hover:text-primary-foreground active:scale-95"
                }
              `}
            >
              {/* アクティブ時の背景グロー */}
              {isActive && (
                <span className="absolute inset-x-4 inset-y-1 bg-gold/10 rounded-lg" />
              )}
              <span className="relative z-10">{item.icon}</span>
              <span className={`relative z-10 text-xs font-medium ${isActive ? "animate-shimmer" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
