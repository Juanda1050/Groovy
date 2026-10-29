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
      album_post_comments: {
        Row: {
          body: string
          created_at: string
          edited_at: string | null
          id: string
          post_id: string
          revision: number
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          edited_at?: string | null
          id: string
          post_id: string
          revision?: number
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          post_id?: string
          revision?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "album_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "album_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      album_post_reactions: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "album_post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "album_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      album_posts: {
        Row: {
          created_at: string
          id: string
          rating: number | null
          review: string | null
          revision: number
          spotify_album_id: string
          updated_at: string
          user_album_id: string
          user_id: string
          visibility: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating?: number | null
          review?: string | null
          revision?: number
          spotify_album_id: string
          updated_at?: string
          user_album_id: string
          user_id: string
          visibility?: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number | null
          review?: string | null
          revision?: number
          spotify_album_id?: string
          updated_at?: string
          user_album_id?: string
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "album_posts_user_album_id_fkey"
            columns: ["user_album_id"]
            isOneToOne: true
            referencedRelation: "user_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_cache: {
        Row: {
          expires_at: string
          fetched_at: string
          image_height: number
          image_url: string
          image_width: number
          name: string
          spotify_artist_id: string
        }
        Insert: {
          expires_at: string
          fetched_at?: string
          image_height: number
          image_url: string
          image_width: number
          name: string
          spotify_artist_id: string
        }
        Update: {
          expires_at?: string
          fetched_at?: string
          image_height?: number
          image_url?: string
          image_width?: number
          name?: string
          spotify_artist_id?: string
        }
        Relationships: []
      }
      artist_page_cache: {
        Row: {
          blocked_until: string | null
          cache_key: string
          created_at: string
          expires_at: string | null
          fetched_at: string | null
          lease_token: string | null
          lease_until: string | null
          payload: Json | null
        }
        Insert: {
          blocked_until?: string | null
          cache_key: string
          created_at?: string
          expires_at?: string | null
          fetched_at?: string | null
          lease_token?: string | null
          lease_until?: string | null
          payload?: Json | null
        }
        Update: {
          blocked_until?: string | null
          cache_key?: string
          created_at?: string
          expires_at?: string | null
          fetched_at?: string | null
          lease_token?: string | null
          lease_until?: string | null
          payload?: Json | null
        }
        Relationships: []
      }
      music_onboarding: {
        Row: {
          album_ids: string[]
          artist_ids: string[]
          completed_at: string
          known_album_ids: string[]
          track_ids: string[]
          user_id: string
        }
        Insert: {
          album_ids?: string[]
          artist_ids: string[]
          completed_at?: string
          known_album_ids?: string[]
          track_ids?: string[]
          user_id: string
        }
        Update: {
          album_ids?: string[]
          artist_ids?: string[]
          completed_at?: string
          known_album_ids?: string[]
          track_ids?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_onboarding_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_follows: {
        Row: {
          created_at: string
          followed_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          followed_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          followed_id?: string
          follower_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_follows_followed_id_fkey"
            columns: ["followed_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      user_music_preferences: {
        Row: {
          created_at: string
          entity_type: string
          is_favorite: boolean
          revision: number
          sentiment: string | null
          spotify_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_type: string
          is_favorite?: boolean
          revision?: number
          sentiment?: string | null
          spotify_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_type?: string
          is_favorite?: boolean
          revision?: number
          sentiment?: string | null
          spotify_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_music_preferences_user_id_fkey"
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
      claim_artist_page_cache: { Args: { p_cache_key: string }; Returns: Json }
      cleanup_expired_resources: { Args: never; Returns: Json }
      complete_artist_page_cache: {
        Args: {
          p_cache_key: string
          p_lease_token: string
          p_payload: Json
          p_ttl_seconds: number
        }
        Returns: boolean
      }
      complete_music_onboarding: {
        Args: {
          p_album_ids?: string[]
          p_artist_ids: string[]
          p_known_album_ids?: string[]
          p_track_ids?: string[]
        }
        Returns: {
          album_ids: string[]
          artist_ids: string[]
          completed_at: string
          known_album_ids: string[]
          track_ids: string[]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "music_onboarding"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
      delete_album_post_comment: {
        Args: { p_comment_id: string; p_post_id: string }
        Returns: boolean
      }
      delete_user_album: { Args: { p_user_album_id: string }; Returns: boolean }
      fail_artist_page_cache: {
        Args: {
          p_cache_key: string
          p_lease_token: string
          p_retry_seconds: number
        }
        Returns: undefined
      }
      get_album_feed: {
        Args: {
          p_before_created_at?: string
          p_before_id?: string
          p_limit?: number
        }
        Returns: {
          created_at: string
          id: string
          rating: number | null
          review: string | null
          revision: number
          spotify_album_id: string
          updated_at: string
          user_album_id: string
          user_id: string
          visibility: string
        }[]
        SetofOptions: {
          from: "*"
          to: "album_posts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_album_post_comments: {
        Args: {
          p_before_created_at?: string
          p_before_id?: string
          p_limit?: number
          p_post_id: string
        }
        Returns: {
          avatar_url: string
          body: string
          created_at: string
          display_name: string
          edited_at: string
          id: string
          post_id: string
          revision: number
          user_id: string
          username: string
        }[]
      }
      get_album_post_reactions: {
        Args: {
          p_before_created_at?: string
          p_before_user_id?: string
          p_limit?: number
          p_post_id: string
        }
        Returns: {
          avatar_url: string
          created_at: string
          display_name: string
          id: string
          username: string
        }[]
      }
      get_community_social: {
        Args: { p_post_ids: string[] }
        Returns: {
          following_author: boolean
          library_status: string
          post_id: string
          reacted: boolean
          reaction_count: number
        }[]
      }
      get_following_album_feed: {
        Args: {
          p_before_created_at?: string
          p_before_id?: string
          p_limit?: number
        }
        Returns: {
          created_at: string
          id: string
          rating: number | null
          review: string | null
          revision: number
          spotify_album_id: string
          updated_at: string
          user_album_id: string
          user_id: string
          visibility: string
        }[]
        SetofOptions: {
          from: "*"
          to: "album_posts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_my_album_collection: {
        Args: { p_filter?: string; p_page?: number }
        Returns: Json
      }
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
      get_profile_album_feed: {
        Args: {
          p_before_created_at?: string
          p_before_id?: string
          p_limit?: number
          p_profile_id: string
        }
        Returns: {
          created_at: string
          id: string
          rating: number | null
          review: string | null
          revision: number
          spotify_album_id: string
          updated_at: string
          user_album_id: string
          user_id: string
          visibility: string
        }[]
        SetofOptions: {
          from: "*"
          to: "album_posts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_public_profile: {
        Args: { p_profile_id: string }
        Returns: {
          avatar_url: string
          bio: string
          display_name: string
          followers_count: number
          following: boolean
          following_count: number
          id: string
          username: string
        }[]
      }
      get_username_login_email: {
        Args: { p_username: string }
        Returns: string
      }
      reserve_spotify_request: {
        Args: never
        Returns: {
          allowed: boolean
          retry_after_seconds: number
        }[]
      }
      save_album_post_comment: {
        Args: { p_body: string; p_comment_id: string; p_post_id: string }
        Returns: string
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
      search_public_profiles: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          avatar_url: string
          display_name: string
          following: boolean
          id: string
          username: string
        }[]
      }
      set_community_action: {
        Args: { p_action: string; p_active: boolean; p_target_id: string }
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
      set_music_preference: {
        Args: {
          p_action: string
          p_active: boolean
          p_entity_type: string
          p_expected_revision: number
          p_spotify_id: string
        }
        Returns: {
          created_at: string
          entity_type: string
          is_favorite: boolean
          revision: number
          sentiment: string | null
          spotify_id: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_music_preferences"
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
      update_album_post_comment: {
        Args: {
          p_body: string
          p_comment_id: string
          p_expected_revision: number
          p_post_id: string
        }
        Returns: {
          body: string
          created_at: string
          edited_at: string | null
          id: string
          post_id: string
          revision: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "album_post_comments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
