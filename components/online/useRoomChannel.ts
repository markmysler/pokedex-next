"use client";

import { useEffect, useRef } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { RoomSlot } from "@/types/pokemon";

export interface RoundResultPayload {
  log: string[];
  turnCount: number;
  fighter1: unknown;
  fighter2: unknown;
  over: boolean;
  winner: RoomSlot | null;
}

interface RoomChannelHandlers {
  onBattleStart: (payload: { fighter1: unknown; fighter2: unknown }) => void;
  onRoundResult: (payload: RoundResultPayload) => void;
  onOpponentMoveSubmitted: () => void;
  onOpponentLeft: () => void;
}

// Subscribes to the Supabase Realtime broadcast channel for one room. All
// events are pushed by Route Handlers (app/api/rooms/**) via
// lib/supabase/broadcast.ts — this hook only listens, never sends.
export function useRoomChannel(roomCode: string | null, handlers: RoomChannelHandlers) {
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!roomCode) return;

    const supabase = getSupabaseBrowserClient();
    const channel: RealtimeChannel = supabase
      .channel(`room:${roomCode}`)
      .on("broadcast", { event: "battle-start" }, ({ payload }) => handlersRef.current.onBattleStart(payload as never))
      .on("broadcast", { event: "round-result" }, ({ payload }) => handlersRef.current.onRoundResult(payload as never))
      .on("broadcast", { event: "opponent-move-submitted" }, () => handlersRef.current.onOpponentMoveSubmitted())
      .on("broadcast", { event: "opponent-left" }, () => handlersRef.current.onOpponentLeft())
      .subscribe((status, err) => {
        // Broadcasts are silent on failure otherwise — this is the only
        // signal that the client ever actually joined the channel. Check
        // the browser console if round updates aren't arriving.
        if (status === "SUBSCRIBED") {
          console.log(`[room:${roomCode}] subscribed to realtime channel`);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          console.error(`[room:${roomCode}] realtime subscription ${status}`, err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode]);
}
