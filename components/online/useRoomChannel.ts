"use client";

import { useEffect, useRef } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { RoomSlot } from "@/types/pokemon";

export interface RoundResultPayload {
  log: string[];
  turnCount: number;
  team1: unknown;
  team2: unknown;
  awaitingForcedSwitch: RoomSlot | null;
  over: boolean;
  winner: RoomSlot | null;
  // Only meaningful when `over` is true — the winner's dialog reads this,
  // the loser's dialog never mentions a lootbox regardless of its value.
  lootboxGranted?: boolean;
  // The winner's lootbox id, for "Open it now" (upgrades/04-lootbox-opening.md).
  lootboxId?: string | null;
}

export interface ChatMessagePayload {
  text: string;
  senderDisplayName: string;
}

interface RoomChannelHandlers {
  onOpponentJoined: () => void;
  onPlayerLockedIn: (payload: { slot: RoomSlot }) => void;
  onBattleStart: (payload: { team1: unknown; team2: unknown }) => void;
  onRoundResult: (payload: RoundResultPayload) => void;
  onOpponentMoveSubmitted: () => void;
  onOpponentLeft: () => void;
  onRematchRequested: (payload: { slot: RoomSlot }) => void;
  onRematchStarted: () => void;
  onChatMessage: (payload: ChatMessagePayload) => void;
}

// Subscribes to the Supabase Realtime broadcast channel for one room. Every
// other event is pushed by Route Handlers (app/api/rooms/**) via
// lib/supabase/broadcast.ts, but chat is different: messages aren't a
// cheating vector, so there's nothing to validate server-side — the
// returned sendChatMessage() sends browser-to-browser directly on this same
// channel with the publishable key, no Route Handler involved (see
// upgrades/08-chat.md). Broadcast doesn't echo back to the sender, so the
// caller is expected to also append its own sent message locally.
export function useRoomChannel(roomCode: string | null, handlers: RoomChannelHandlers) {
  const handlersRef = useRef(handlers);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!roomCode) {
      channelRef.current = null;
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const channel: RealtimeChannel = supabase
      .channel(`room:${roomCode}`)
      .on("broadcast", { event: "opponent-joined" }, () => handlersRef.current.onOpponentJoined())
      .on("broadcast", { event: "player-locked-in" }, ({ payload }) => handlersRef.current.onPlayerLockedIn(payload as never))
      .on("broadcast", { event: "battle-start" }, ({ payload }) => handlersRef.current.onBattleStart(payload as never))
      .on("broadcast", { event: "round-result" }, ({ payload }) => handlersRef.current.onRoundResult(payload as never))
      .on("broadcast", { event: "opponent-move-submitted" }, () => handlersRef.current.onOpponentMoveSubmitted())
      .on("broadcast", { event: "opponent-left" }, () => handlersRef.current.onOpponentLeft())
      .on("broadcast", { event: "rematch-requested" }, ({ payload }) => handlersRef.current.onRematchRequested(payload as never))
      .on("broadcast", { event: "rematch-started" }, () => handlersRef.current.onRematchStarted())
      .on("broadcast", { event: "chat-message" }, ({ payload }) => handlersRef.current.onChatMessage(payload as never))
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

    channelRef.current = channel;

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [roomCode]);

  function sendChatMessage(payload: ChatMessagePayload) {
    channelRef.current?.send({ type: "broadcast", event: "chat-message", payload });
  }

  return { sendChatMessage };
}
