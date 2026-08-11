export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
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
          like_count: number
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
          like_count?: number
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
          like_count?: number
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
          {
            foreignKeyName: "collection_entries_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          followee_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          followee_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          followee_id?: string
          follower_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_followee_id_fkey"
            columns: ["followee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_links: {
        Row: {
          code: string
          created_at: string
          id: string
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invite_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          entry_id: string
          note: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          note?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          note?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "collection_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          is_admin: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_admin?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_admin?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      shelf_shares: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invite_code: string | null
          owner_id: string
          shared_with_id: string | null
          status: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invite_code?: string | null
          owner_id: string
          shared_with_id?: string | null
          status?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invite_code?: string | null
          owner_id?: string
          shared_with_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "shelf_shares_owner_profiles_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shelf_shares_shared_with_profiles_fkey"
            columns: ["shared_with_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_like_entry: { Args: { target_entry_id: string }; Returns: boolean }
      follow_via_invite: { Args: { invite_code: string }; Returns: Json }
      follows_me: { Args: { target_user_id: string }; Returns: boolean }
      get_all_collection_entries_admin: {
        Args: never
        Returns: {
          alcohol_id: string
          alcohol_name: string
          alcohol_subtype: string
          alcohol_type: string
          created_at: string
          drinking_date: string
          id: string
          memo: string
          photo_url: string
          rating: number
          user_display_name: string
          user_id: string
        }[]
      }
      get_all_profiles_admin: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          id: string
          is_admin: boolean
        }[]
      }
      get_user_collection_entries_admin: {
        Args: { target_user_id: string }
        Returns: {
          alcohol_id: string
          alcohol_name: string
          alcohol_subtype: string
          alcohol_type: string
          created_at: string
          drinking_date: string
          id: string
          memo: string
          photo_url: string
          rating: number
        }[]
      }
      get_user_emails_admin: {
        Args: never
        Returns: {
          email: string
          id: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      peek_invite: { Args: { invite_code: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
