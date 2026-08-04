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
    PostgrestVersion: "14.15"
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
      audit_log: {
        Row: {
          acteur: string
          action: string
          created_at: string
          id: string
          payload: Json | null
          tournament_id: string | null
        }
        Insert: {
          acteur: string
          action: string
          created_at?: string
          id?: string
          payload?: Json | null
          tournament_id?: string | null
        }
        Update: {
          acteur?: string
          action?: string
          created_at?: string
          id?: string
          payload?: Json | null
          tournament_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          id: string
          nom: string
          ville: string | null
        }
        Insert: {
          id?: string
          nom: string
          ville?: string | null
        }
        Update: {
          id?: string
          nom?: string
          ville?: string | null
        }
        Relationships: []
      }
      courts: {
        Row: {
          club_id: string
          id: string
          nom: string
          ordre: number
        }
        Insert: {
          club_id: string
          id?: string
          nom: string
          ordre?: number
        }
        Update: {
          club_id?: string
          id?: string
          nom?: string
          ordre?: number
        }
        Relationships: [
          {
            foreignKeyName: "courts_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      group_teams: {
        Row: {
          group_id: string
          position_tirage: number | null
          team_id: string
        }
        Insert: {
          group_id: string
          position_tirage?: number | null
          team_id: string
        }
        Update: {
          group_id?: string
          position_tirage?: number | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_teams_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          id: string
          nom: string
          ordre: number
          tournament_id: string
        }
        Insert: {
          id?: string
          nom: string
          ordre?: number
          tournament_id: string
        }
        Update: {
          id?: string
          nom?: string
          ordre?: number
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      match_sets: {
        Row: {
          jeux_a: number
          jeux_b: number
          match_id: string
          numero: number
          tiebreak_a: number | null
          tiebreak_b: number | null
        }
        Insert: {
          jeux_a: number
          jeux_b: number
          match_id: string
          numero: number
          tiebreak_a?: number | null
          tiebreak_b?: number | null
        }
        Update: {
          jeux_a?: number
          jeux_b?: number
          match_id?: string
          numero?: number
          tiebreak_a?: number | null
          tiebreak_b?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "match_sets_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          bracket_slot: number | null
          court_id: string | null
          duree_estimee: number | null
          format_override: Json | null
          group_id: string | null
          id: string
          next_match_id: string | null
          next_slot: string | null
          phase: string
          round: number
          scheduled_at: string | null
          statut: string
          team_a_id: string | null
          team_b_id: string | null
          tournament_id: string
          winner_id: string | null
        }
        Insert: {
          bracket_slot?: number | null
          court_id?: string | null
          duree_estimee?: number | null
          format_override?: Json | null
          group_id?: string | null
          id?: string
          next_match_id?: string | null
          next_slot?: string | null
          phase: string
          round: number
          scheduled_at?: string | null
          statut?: string
          team_a_id?: string | null
          team_b_id?: string | null
          tournament_id: string
          winner_id?: string | null
        }
        Update: {
          bracket_slot?: number | null
          court_id?: string | null
          duree_estimee?: number | null
          format_override?: Json | null
          group_id?: string | null
          id?: string
          next_match_id?: string | null
          next_slot?: string | null
          phase?: string
          round?: number
          scheduled_at?: string | null
          statut?: string
          team_a_id?: string | null
          team_b_id?: string | null
          tournament_id?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_next_match_id_fkey"
            columns: ["next_match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          classement_fft: string | null
          email: string | null
          id: string
          nom: string
          prenom: string
          sexe: string | null
          telephone: string | null
          user_id: string | null
        }
        Insert: {
          classement_fft?: string | null
          email?: string | null
          id?: string
          nom: string
          prenom: string
          sexe?: string | null
          telephone?: string | null
          user_id?: string | null
        }
        Update: {
          classement_fft?: string | null
          email?: string | null
          id?: string
          nom?: string
          prenom?: string
          sexe?: string | null
          telephone?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      registrations: {
        Row: {
          id: string
          player_id: string | null
          statut: string
          team_id: string | null
          tournament_id: string
          type: string
        }
        Insert: {
          id?: string
          player_id?: string | null
          statut?: string
          team_id?: string | null
          tournament_id: string
          type: string
        }
        Update: {
          id?: string
          player_id?: string | null
          statut?: string
          team_id?: string | null
          tournament_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      standings: {
        Row: {
          d: number
          group_id: string | null
          jeux_g: number
          jeux_p: number
          joues: number
          rang: number | null
          ratio_jeux: number | null
          ratio_sets: number | null
          sets_g: number
          sets_p: number
          team_id: string
          tournament_id: string
          v: number
        }
        Insert: {
          d?: number
          group_id?: string | null
          jeux_g?: number
          jeux_p?: number
          joues?: number
          rang?: number | null
          ratio_jeux?: number | null
          ratio_sets?: number | null
          sets_g?: number
          sets_p?: number
          team_id: string
          tournament_id: string
          v?: number
        }
        Update: {
          d?: number
          group_id?: string | null
          jeux_g?: number
          jeux_p?: number
          joues?: number
          rang?: number | null
          ratio_jeux?: number | null
          ratio_sets?: number | null
          sets_g?: number
          sets_p?: number
          team_id?: string
          tournament_id?: string
          v?: number
        }
        Relationships: [
          {
            foreignKeyName: "standings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standings_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      team_players: {
        Row: {
          player_id: string
          team_id: string
        }
        Insert: {
          player_id: string
          team_id: string
        }
        Update: {
          player_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          id: string
          nom_affiche: string
          origine: string
          seed: number | null
          tournament_id: string
        }
        Insert: {
          id?: string
          nom_affiche: string
          origine: string
          seed?: number | null
          tournament_id: string
        }
        Update: {
          id?: string
          nom_affiche?: string
          origine?: string
          seed?: number | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          club_id: string
          created_at: string
          date: string
          duree_match_min: number | null
          format_config: Json
          genre: string | null
          id: string
          nb_qualifies: number | null
          niveau: string | null
          nom: string
          pause_min: number | null
          public_slug: string | null
          statut: string
          tiebreak_rules: Json
          tirage_seed: number | null
        }
        Insert: {
          club_id: string
          created_at?: string
          date: string
          duree_match_min?: number | null
          format_config?: Json
          genre?: string | null
          id?: string
          nb_qualifies?: number | null
          niveau?: string | null
          nom: string
          pause_min?: number | null
          public_slug?: string | null
          statut?: string
          tiebreak_rules?: Json
          tirage_seed?: number | null
        }
        Update: {
          club_id?: string
          created_at?: string
          date?: string
          duree_match_min?: number | null
          format_config?: Json
          genre?: string | null
          id?: string
          nb_qualifies?: number | null
          niveau?: string | null
          nom?: string
          pause_min?: number | null
          public_slug?: string | null
          statut?: string
          tiebreak_rules?: Json
          tirage_seed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
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
