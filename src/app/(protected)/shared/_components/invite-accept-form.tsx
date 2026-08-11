"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

type Props = {
  /** 招待した相手の表示名 */
  displayName: string | null;
  /**
   * フォローを実行するServer Action（招待コードをbind済み）。
   * 成功時はサーバー側でredirectするため戻り値はvoidになる。
   */
  onAccept: () => Promise<{ error: string } | void>;
};

/** /invite/[code] の「フォローしますか？」確認フォーム */
export function InviteAcceptForm({ displayName, onAccept }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const name = displayName || "このユーザー";

  const handleAccept = () => {
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await onAccept();
      if (result?.error) {
        setError(result.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      {error && (
        <div
          role="alert"
          className="p-3 rounded-lg bg-vermilion/10 border border-vermilion/20"
        >
          <p className="text-sm text-vermilion">{error}</p>
        </div>
      )}

      <p className="text-center text-lg font-bold text-foreground">
        {name}さんをフォローしますか？
      </p>
      <p className="text-center text-sm text-muted-foreground">
        フォローすると、{name}
        さんの投稿があなたの「フォロー中」に表示されます。あなたの投稿は相手には表示されません。
      </p>

      <button
        type="button"
        onClick={handleAccept}
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl btn-primary-gradient text-primary-foreground font-semibold disabled:opacity-50"
      >
        {isPending ? (
          <>
            <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            フォロー中...
          </>
        ) : (
          "フォローする"
        )}
      </button>

      <Link
        href="/shelf"
        aria-disabled={isPending}
        className={`block w-full text-center px-4 py-3 rounded-xl bg-muted text-muted-foreground font-semibold text-sm hover:bg-muted/80 transition-colors ${
          isPending ? "pointer-events-none opacity-50" : ""
        }`}
      >
        キャンセル
      </Link>
    </div>
  );
}
