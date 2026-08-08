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
          friend_code: string;
          created_at: string;
          pokemon_released_count: number;
        };
        Insert: {
          user_id: string;
          display_name: string;
          friend_code: string;
          created_at?: string;
          pokemon_released_count?: number;
        };
        Update: {
          user_id?: string;
          display_name?: string;
          friend_code?: string;
          created_at?: string;
          pokemon_released_count?: number;
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
          nickname: string | null;
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
          nickname?: string | null;
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
          nickname?: string | null;
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
          player1_team_ids: Json | null;
          player2_id: string | null;
          player2_team_ids: Json | null;
          status: string;
          state: Json;
          created_at: string;
        };
        Insert: {
          code: string;
          player1_id: string;
          player1_team_ids?: Json | null;
          player2_id?: string | null;
          player2_team_ids?: Json | null;
          status?: string;
          state?: Json;
          created_at?: string;
        };
        Update: {
          code?: string;
          player1_id?: string;
          player1_team_ids?: Json | null;
          player2_id?: string | null;
          player2_team_ids?: Json | null;
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
          room_code: string | null;
          team_snapshot: Json | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          opponent: string;
          mode: "bot" | "online";
          won: boolean;
          played_at?: string;
          room_code?: string | null;
          team_snapshot?: Json | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          opponent?: string;
          mode?: "bot" | "online";
          won?: boolean;
          played_at?: string;
          room_code?: string | null;
          team_snapshot?: Json | null;
        };
        Relationships: [];
      };
      friendships: {
        Row: {
          id: string;
          requester_id: string;
          addressee_id: string;
          status: "pending" | "accepted";
          created_at: string;
          responded_at: string | null;
        };
        Insert: {
          id?: string;
          requester_id: string;
          addressee_id: string;
          status?: "pending" | "accepted";
          created_at?: string;
          responded_at?: string | null;
        };
        Update: {
          id?: string;
          requester_id?: string;
          addressee_id?: string;
          status?: "pending" | "accepted";
          created_at?: string;
          responded_at?: string | null;
        };
        Relationships: [];
      };
      friend_messages: {
        Row: {
          id: string;
          friendship_id: string;
          sender_id: string;
          text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          friendship_id: string;
          sender_id: string;
          text: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          friendship_id?: string;
          sender_id?: string;
          text?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      trade_offers: {
        Row: {
          id: string;
          friendship_id: string;
          offered_by: string;
          offered_instance_ids: Json;
          requested_instance_ids: Json;
          status: "pending" | "accepted" | "declined" | "cancelled";
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          friendship_id: string;
          offered_by: string;
          offered_instance_ids: Json;
          requested_instance_ids: Json;
          status?: "pending" | "accepted" | "declined" | "cancelled";
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          friendship_id?: string;
          offered_by?: string;
          offered_instance_ids?: Json;
          requested_instance_ids?: Json;
          status?: "pending" | "accepted" | "declined" | "cancelled";
          created_at?: string;
          resolved_at?: string | null;
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
      accept_trade: {
        Args: { p_trade_id: string; p_accepting_user_id: string };
        Returns: undefined;
      };
      increment_released_count: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      trade_up_pokemon: {
        Args: { p_user_id: string; p_instance_ids: string[] };
        Returns: string;
      };
      claim_lootboxes: {
        Args: { p_user_id: string; p_count: number };
        Returns: Database["public"]["Tables"]["lootboxes"]["Row"][];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
