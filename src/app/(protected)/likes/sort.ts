/**
 * いいね一覧の並び替えの定義。
 *
 * サーバーコンポーネント（page.tsx）とクライアントコンポーネント
 * （_components/likes-sort.tsx）の両方から使うため、独立したファイルに置く。
 * "use client" のファイルから定数をimportすると、サーバー側には実体ではなく
 * クライアント参照が渡され、配列メソッドが使えなくなるため。
 */
export const LIKES_SORT_FIELDS = ["liked", "posted"] as const;

export type LikesSortField = (typeof LIKES_SORT_FIELDS)[number];

export const LIKES_SORT_LABELS: Record<
  LikesSortField,
  { label: string; icon: string }
> = {
  liked: { label: "いいねした日", icon: "❤️" },
  posted: { label: "投稿日", icon: "📅" },
};

export function parseLikesSortField(value: string | undefined): LikesSortField {
  return LIKES_SORT_FIELDS.includes(value as LikesSortField)
    ? (value as LikesSortField)
    : "liked";
}
