// Hand-written to match supabase/migrations/20260807000000_init_schema.sql.
// If you later run `supabase gen types typescript`, that generated file can
// replace this one directly — same shape/convention.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      user_pokedex: {
        Row: {
          anon_id: string;
          pokemon_number: string;
          acquired: boolean;
          notes: string;
          updated_at: string;
        };
        Insert: {
          anon_id: string;
          pokemon_number: string;
          acquired?: boolean;
          notes?: string;
          updated_at?: string;
        };
        Update: {
          anon_id?: string;
          pokemon_number?: string;
          acquired?: boolean;
          notes?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      battle_rooms: {
        Row: {
          code: string;
          player1_id: string;
          player1_fighter: string;
          player2_id: string | null;
          player2_fighter: string | null;
          status: string;
          state: Json;
          created_at: string;
        };
        Insert: {
          code: string;
          player1_id: string;
          player1_fighter: string;
          player2_id?: string | null;
          player2_fighter?: string | null;
          status?: string;
          state?: Json;
          created_at?: string;
        };
        Update: {
          code?: string;
          player1_id?: string;
          player1_fighter?: string;
          player2_id?: string | null;
          player2_fighter?: string | null;
          status?: string;
          state?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      submit_move: {
        Args: { p_code: string; p_slot: number; p_move: Json };
        Returns: Json;
      };
      finalize_round: {
        Args: { p_code: string; p_new_state: Json };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
