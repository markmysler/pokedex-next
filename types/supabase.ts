// Hand-written to match supabase/migrations/*.sql. If you later run
// `supabase gen types typescript`, that generated file can replace this one
// directly — same shape/convention.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          display_name: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          display_name: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          display_name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      user_pokedex: {
        Row: {
          user_id: string;
          pokemon_number: string;
          notes: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          pokemon_number: string;
          notes?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          pokemon_number?: string;
          notes?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pokemon_instances: {
        Row: {
          id: string;
          user_id: string;
          pokemon_number: string;
          hp: number;
          atk: number;
          def: number;
          spatk: number;
          spdef: number;
          spd: number;
          total: number;
          moves: Json;
          is_starter: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          pokemon_number: string;
          hp: number;
          atk: number;
          def: number;
          spatk: number;
          spdef: number;
          spd: number;
          total: number;
          moves: Json;
          is_starter?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          pokemon_number?: string;
          hp?: number;
          atk?: number;
          def?: number;
          spatk?: number;
          spdef?: number;
          spd?: number;
          total?: number;
          moves?: Json;
          is_starter?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      lootboxes: {
        Row: {
          id: string;
          user_id: string;
          opened_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          opened_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          opened_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      battle_rooms: {
        Row: {
          code: string;
          player1_id: string;
          player1_pokemon_instance_id: string;
          player2_id: string | null;
          player2_pokemon_instance_id: string | null;
          status: string;
          state: Json;
          created_at: string;
        };
        Insert: {
          code: string;
          player1_id: string;
          player1_pokemon_instance_id: string;
          player2_id?: string | null;
          player2_pokemon_instance_id?: string | null;
          status?: string;
          state?: Json;
          created_at?: string;
        };
        Update: {
          code?: string;
          player1_id?: string;
          player1_pokemon_instance_id?: string;
          player2_id?: string | null;
          player2_pokemon_instance_id?: string | null;
          status?: string;
          state?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      match_results: {
        Row: {
          id: string;
          user_id: string;
          opponent: string;
          mode: "bot" | "online";
          won: boolean;
          played_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          opponent: string;
          mode: "bot" | "online";
          won: boolean;
          played_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          opponent?: string;
          mode?: "bot" | "online";
          won?: boolean;
          played_at?: string;
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
