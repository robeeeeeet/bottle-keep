export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      alcohols: {
        Row: {
          alcohol_percentage: number | null
          brand: string | null
          characteristics: string[] | null
          created_at: string
          id: string
          name: string
          origin_country: string | null
          origin_region: string | null
          price_range: string | null
          producer: string | null
          raw_llm_response: Json | null
          subtype: string | null
          type: string
          updated_at: string
        }
        Insert: {
          alcohol_percentage?: number | null
          brand?: string | null
          characteristics?: string[] | null
          created_at?: string
          id?: string
          name: string
          origin_country?: string | null
          origin_region?: string | null
          price_range?: string | null
          producer?: string | null
          raw_llm_response?: Json | null
          subtype?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          alcohol_percentage?: number | null
          brand?: string | null
          characteristics?: string[] | null
          created_at?: string
          id?: string
          name?: string
          origin_country?: string | null
          origin_region?: string | null
          price_range?: string | null
          producer?: string | null
          raw_llm_response?: Json | null
          subtype?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      collection_entries: {
        Row: {
          alcohol_id: string
          created_at: string
          drinking_date: string | null
          id: string
          memo: string | null
          photo_url: string | null
          rating: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alcohol_id: string
          created_at?: string
          drinking_date?: string | null
          id?: string
          memo?: string | null
          photo_url?: string | null
          rating?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alcohol_id?: string
          created_at?: string
          drinking_date?: string | null
          id?: string
          memo?: string | null
          photo_url?: string | null
          rating?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_entries_alcohol_id_fkey"
            columns: ["alcohol_id"]
            isOneToOne: false
            referencedRelation: "alcohols"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      shelf_shares: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          owner_id: string
          shared_with_id: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          owner_id: string
          shared_with_id: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          owner_id?: string
          shared_with_id?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// 便利な型エイリアス
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]

export type Alcohols = Tables<"alcohols">
export type CollectionEntries = Tables<"collection_entries">
export type Profiles = Tables<"profiles">
export type ShelfShares = Tables<"shelf_shares">

// 編集ページで使用する型（SELECTで取得するフィールドのみ）
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
}
