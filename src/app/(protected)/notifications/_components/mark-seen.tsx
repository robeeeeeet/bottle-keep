"use client";

import { useEffect, useRef } from "react";
import { markNotificationsSeen } from "../actions";

/**
 * 通知ページを開いたら既読にする。
 *
 * 描画後に実行するので、その回の「新着◯件」表示は残る（次回から消える）。
 * 何も表示しない。
 */
export function MarkSeen({ hasUnread }: { hasUnread: boolean }) {
  // 再レンダリングで二重に呼ばないようにする
  const doneRef = useRef(false);

  useEffect(() => {
    if (!hasUnread || doneRef.current) return;
    doneRef.current = true;

    markNotificationsSeen().catch((error) => {
      // 既読化の失敗は表示に影響しないためログのみ
      console.error("Failed to mark notifications as seen:", error);
    });
  }, [hasUnread]);

  return null;
}
