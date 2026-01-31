"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // パスが変わったらナビゲーション完了
    setIsNavigating(false);
    setProgress(100);

    const timer = setTimeout(() => {
      setProgress(0);
    }, 200);

    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  useEffect(() => {
    let progressTimer: NodeJS.Timeout;

    if (isNavigating) {
      setProgress(10);
      progressTimer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 200);
    }

    return () => {
      if (progressTimer) clearInterval(progressTimer);
    };
  }, [isNavigating]);

  // リンククリックを監視
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");

      if (
        anchor &&
        anchor.href &&
        anchor.href.startsWith(window.location.origin) &&
        !anchor.href.includes("#") &&
        anchor.target !== "_blank"
      ) {
        const url = new URL(anchor.href);
        if (url.pathname !== pathname) {
          setIsNavigating(true);
        }
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pathname]);

  if (progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-0.5">
      <div
        className="h-full bg-gradient-to-r from-gold via-accent to-gold transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}
