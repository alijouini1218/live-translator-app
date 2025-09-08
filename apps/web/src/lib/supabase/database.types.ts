export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          plan: string
          display_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          plan?: string
          display_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          plan?: string
          display_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      sessions: {
        Row: {
          id: string
          user_id: string
          source_lang: string | null
          target_lang: string
          mode: string
          started_at: string
          ended_at: string | null
          duration_ms: number | null
          characters: number
          cost_cents: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          source_lang?: string | null
          target_lang: string
          mode: string
          started_at?: string
          ended_at?: string | null
          duration_ms?: number | null
          characters?: number
          cost_cents?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          source_lang?: string | null
          target_lang?: string
          mode?: string
          started_at?: string
          ended_at?: string | null
          duration_ms?: number | null
          characters?: number
          cost_cents?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      transcripts: {
        Row: {
          id: string
          session_id: string
          t0_ms: number
          t1_ms: number
          source_text: string | null
          target_text: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          t0_ms: number
          t1_ms: number
          source_text?: string | null
          target_text?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          t0_ms?: number
          t1_ms?: number
          source_text?: string | null
          target_text?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcripts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      session_stats: {
        Row: {
          user_id: string | null
          total_sessions: number | null
          total_duration_ms: number | null
          total_characters: number | null
          total_cost_cents: number | null
          avg_duration_ms: number | null
          live_sessions: number | null
          ptt_sessions: number | null
        }
        Relationships: []
      }
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