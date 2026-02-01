"use client";

import { useEffect } from "react";

type Props = {
  isOpen: boolean;
  alcoholName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
};

export function DeleteModal({
  isOpen,
  alcoholName,
  onConfirm,
  onCancel,
  isDeleting,
}: Props) {
  // モーダル表示中はスクロールを無効化
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
        onClick={isDeleting ? undefined : onCancel}
      />

      {/* モーダル */}
      <div className="relative bg-background rounded-2xl shadow-xl mx-4 w-full max-w-sm animate-in zoom-in-95 duration-200">
        <div className="p-6">
          {/* 警告アイコン */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* タイトル */}
          <h2 className="text-lg font-bold text-center text-foreground mb-2">
            {alcoholName}を削除しますか？
          </h2>

          {/* 説明 */}
          <p className="text-sm text-muted-foreground text-center mb-6">
            この操作は取り消せません。
            <br />
            写真やメモもすべて削除されます。
          </p>

          {/* ボタン */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isDeleting}
              className="flex-1 py-3 px-4 rounded-lg bg-muted border border-border text-foreground font-medium hover:bg-muted/80 transition-colors disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 py-3 px-4 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isDeleting ? (
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
                  削除中...
                </>
              ) : (
                "削除する"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
