"use client";

import { useState, useTransition } from "react";
import type { PostCardData } from "@/types/db";
import { PostCard } from "../../shelf/_components/post-card";
import { updateLikeNote } from "../../shelf/actions";

const NOTE_MAX_LENGTH = 500;

/**
 * いいね一覧の1件。投稿カード＋自分用メモの編集。
 * メモはフォローを解除した相手の投稿でも編集できる。
 */
export function LikedPost({
  post,
  unavailable,
}: {
  post: PostCardData;
  unavailable: boolean;
}) {
  const [note, setNote] = useState(post.myNote ?? "");
  const [savedNote, setSavedNote] = useState(post.myNote ?? "");
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateLikeNote(post.id, note);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSavedNote(note.trim());
      setIsEditing(false);
    });
  };

  const handleCancel = () => {
    setNote(savedNote);
    setError(null);
    setIsEditing(false);
  };

  return (
    <div className="space-y-0">
      {/* unavailable の場合、メモはカード側で表示されるので二重に出さない */}
      <PostCard
        post={{ ...post, myNote: savedNote || null }}
        variant="liked"
        unavailable={unavailable}
      />

      {!unavailable && (
        <div className="card-tatami -mt-2 pt-3 px-3 pb-3 rounded-t-none border-t-0">
          {isEditing ? (
            <div className="space-y-2">
              <label
                htmlFor={`note-${post.id}`}
                className="text-xs font-medium text-muted-foreground"
              >
                自分用のメモ（相手には見えません）
              </label>
              <textarea
                id={`note-${post.id}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={NOTE_MAX_LENGTH}
                rows={3}
                placeholder="次に飲むときのために覚えておきたいことなど..."
                className="input-japanese w-full text-sm"
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {note.length} / {NOTE_MAX_LENGTH}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isPending}
                    className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isPending}
                    className="px-4 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-lg disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isPending && (
                      <span
                        className="w-3 h-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"
                        aria-hidden="true"
                      />
                    )}
                    保存
                  </button>
                </div>
              </div>
              {error && (
                <p role="alert" className="text-xs text-vermilion">
                  {error}
                </p>
              )}
            </div>
          ) : savedNote ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="w-full text-left group"
            >
              <span className="text-xs text-muted-foreground block mb-1">
                自分のメモ
                <span className="ml-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  編集
                </span>
              </span>
              <span className="text-sm text-foreground whitespace-pre-wrap">
                {savedNote}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-xs text-primary hover:text-primary-dark transition-colors flex items-center gap-1.5"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              メモを追加
            </button>
          )}
        </div>
      )}
    </div>
  );
}
