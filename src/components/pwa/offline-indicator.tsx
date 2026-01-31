"use client";

import { useEffect, useSyncExternalStore, useReducer } from "react";

// オンライン状態を購読
function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true; // サーバーサイドでは常にオンラインとみなす
}

type State = {
  showBanner: boolean;
  prevOnline: boolean;
};

type Action =
  | { type: "ONLINE_CHANGED"; isOnline: boolean }
  | { type: "HIDE_BANNER" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ONLINE_CHANGED":
      if (state.prevOnline !== action.isOnline) {
        return { showBanner: true, prevOnline: action.isOnline };
      }
      return state;
    case "HIDE_BANNER":
      return { ...state, showBanner: false };
    default:
      return state;
  }
}

export function OfflineIndicator() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [state, dispatch] = useReducer(reducer, {
    showBanner: false,
    prevOnline: true,
  });

  // オンライン状態の変化を検知
  useEffect(() => {
    dispatch({ type: "ONLINE_CHANGED", isOnline });
  }, [isOnline]);

  // オンラインに戻った時は3秒後にバナーを消す
  useEffect(() => {
    if (state.showBanner && isOnline) {
      const timer = setTimeout(() => dispatch({ type: "HIDE_BANNER" }), 3000);
      return () => clearTimeout(timer);
    }
  }, [state.showBanner, isOnline]);

  if (!state.showBanner) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 py-2 px-4 text-center text-sm font-medium transition-colors ${
        isOnline
          ? "bg-accent text-accent-foreground"
          : "bg-gold text-primary"
      }`}
    >
      {isOnline ? (
        <span>✓ オンラインに復帰しました</span>
      ) : (
        <span>⚠ オフラインです - 一部機能が制限されます</span>
      )}
    </div>
  );
}
