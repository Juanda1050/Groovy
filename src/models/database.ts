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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      album_cache: {
        Row: {
          artists: Json
          cover_url: string | null
          expires_at: string
          fetched_at: string
          name: string
          release_date: string | null
          release_date_precision: string | null
          spotify_album_id: string
          total_tracks: number
        }
        Insert: {
          artists: Json
          cover_url?: string | null
          expires_at: string
          fetched_at?: string
          name: string
          release_date?: string | null
          release_date_precision?: string | null
          spotify_album_id: string
          total_tracks: number
        }
        Update: {
          artists?: Json
          cover_url?: string | null
          expires_at?: string
          fetched_at?: string
          name?: string
          release_date?: string | null
          release_date_precision?: string | null
          spotify_album_id?: string
          total_tracks?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string
          created_at: string
          display_name: string
          id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string
          created_at?: string
          display_name?: string
          id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string
          created_at?: string
          display_name?: string
          id?: string
          username?: string | null
        }
        Relationships: []
      }
      user_albums: {
        Row: {
          created_at: string
          id: string
          listened_at: string | null
          rating: number | null
          review: string | null
          spotify_album_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listened_at?: string | null
          rating?: number | null
          review?: string | null
          spotify_album_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listened_at?: string | null
          rating?: number | null
          review?: string | null
          spotify_album_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_albums_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          locale: string
          user_id: string
        }
        Insert: {
          locale?: string
          user_id: string
        }
        Update: {
          locale?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_track_picks: {
        Row: {
          created_at: string
          preference: string
          spotify_track_id: string
          user_album_id: string
        }
        Insert: {
          created_at?: string
          preference: string
          spotify_track_id: string
          user_album_id: string
        }
        Update: {
          created_at?: string
          preference?: string
          spotify_track_id?: string
          user_album_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_track_picks_user_album_id_fkey"
            columns: ["user_album_id"]
            isOneToOne: false
            referencedRelation: "user_albums"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_album_to_library: {
        Args: { p_spotify_album_id: string; p_status?: string }
        Returns: {
          created_at: string
          id: string
          listened_at: string | null
          rating: number | null
          review: string | null
          spotify_album_id: string
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_albums"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      authorize_spotify_action: {
        Args: { p_action: string }
        Returns: {
          allowed: boolean
          retry_after_seconds: number
          user_id: string
        }[]
      }
      block_spotify_requests: {
        Args: { p_seconds: number }
        Returns: undefined
      }
      cleanup_expired_resources: { Args: never; Returns: Json }
      consume_request_budget: {
        Args: {
          p_bucket_key: string
          p_limit: number
          p_window_seconds: number
        }
        Returns: {
          allowed: boolean
          remaining: number
          retry_after_seconds: number
        }[]
      }
      delete_user_album: { Args: { p_user_album_id: string }; Returns: boolean }
      get_my_library: {
        Args: {
          p_before_created_at?: string
          p_before_id?: string
          p_filter?: string
          p_limit?: number
        }
        Returns: {
          album_name: string
          artist_names: string[]
          cover_url: string
          created_at: string
          has_review: boolean
          id: string
          metadata_available: boolean
          rating: number
          spotify_album_id: string
          status: string
        }[]
      }
      reserve_spotify_request: {
        Args: never
        Returns: {
          allowed: boolean
          retry_after_seconds: number
        }[]
      }
      save_profile: {
        Args: { p_bio?: string; p_display_name: string; p_username: string }
        Returns: {
          avatar_url: string | null
          bio: string
          created_at: string
          display_name: string
          id: string
          username: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_profile_avatar: {
        Args: { p_avatar_path: string }
        Returns: {
          avatar_url: string | null
          bio: string
          created_at: string
          display_name: string
          id: string
          username: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_user_album: {
        Args: {
          p_favorite_track_ids?: string[]
          p_least_favorite_track_ids?: string[]
          p_listened_at?: string
          p_rating?: number
          p_review?: string
          p_spotify_album_id: string
          p_status: string
        }
        Returns: {
          created_at: string
          id: string
          listened_at: string | null
          rating: number | null
          review: string | null
          spotify_album_id: string
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_albums"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_user_track_pick: {
        Args: {
          p_preference: string
          p_spotify_album_id: string
          p_spotify_track_id: string
        }
        Returns: Database["public"]["Tables"]["user_track_picks"]["Row"][]
      }
      touch_groovy_session: { Args: never; Returns: boolean }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
