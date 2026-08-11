/**
 * アプリ用の型エイリアス。
 *
 * `database.types.ts` は `npm run gen:types` で**上書き生成**されるため、
 * 手書きの型はこのファイルに置くこと（生成時に消えるのを防ぐため）。
 */
import type { Tables } from "./database.types";

export type Alcohols = Tables<"alcohols">;
export type CollectionEntries = Tables<"collection_entries">;
export type Profiles = Tables<"profiles">;
export type Follows = Tables<"follows">;
export type InviteLinks = Tables<"invite_links">;
export type PostLikes = Tables<"post_likes">;

/** 編集ページで使用する型（SELECTで取得するフィールドのみ） */
export type CollectionEntryWithAlcohol = {
  id: string;
  photo_url: string | null;
  drinking_date: string | null;
  rating: number | null;
  memo: string | null;
  alcohols: {
    id: string;
    name: string;
    type: string;
    subtype: string | null;
    brand: string | null;
    producer: string | null;
    origin_country: string | null;
    origin_region: string | null;
    alcohol_percentage: number | null;
    characteristics: string[] | null;
  } | null;
};

/** 一覧に表示する1投稿（自分の投稿・フォロー中の投稿で共通） */
export type PostCardData = {
  id: string;
  photo_url: string | null;
  drinking_date: string | null;
  rating: number | null;
  memo: string | null;
  created_at: string;
  user_id: string;
  like_count: number;
  alcohol: {
    id: string;
    name: string;
    type: string;
    subtype: string | null;
  } | null;
  /** 投稿者。自分の投稿の一覧では不要なのでnull許容 */
  author: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  /** 自分がいいね済みか（フォロー中タブ・いいね一覧で使う） */
  likedByMe?: boolean;
  /** いいねに添えた自分用メモ（いいね一覧で使う） */
  myNote?: string | null;
};

/** フォロー関係の相手（フォロー中／フォロワー一覧で使う） */
export type FollowUser = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  since: string;
  /** 相互フォローかどうか（フォロワー一覧の「フォロー返し」判定に使う） */
  isMutual: boolean;
};
