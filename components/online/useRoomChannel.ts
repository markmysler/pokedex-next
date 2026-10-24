"use client";

import { useEffect, useRef } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import type { RealtimeChannel, REALTIME_SUBSCRIBE_STATES } from "@supabase/supabase-js";
import type { RoomSlot } from "@/types/pokemon";
import type { BattleEvent, BattleLogEvent } from "@/lib/battleEngine";

export interface RoundResultPayload {
  log: BattleLogEvent[];
  turnCount: number;
  team1: unknown;
  team2: unknown;
  awaitingForcedSwitch: RoomSlot | null;
  over: boolean;
  winner: RoomSlot | null;
  // Structured per-action data (upgrades/10-battle-depth.md) — undefined on
  // the forced-switch micro-turn, which has no attack to report. Consumed
  // by upgrades/11-sound-effects.md to trigger the right sound per event
  // instead of parsing `log` strings.
  events?: BattleEvent[];
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
  onOpponentLeft: (payload: { forfeit?: boolean }) => void;
  onRematchRequested: (payload: { slot: RoomSlot }) => void;
  onRematchStarted: () => void;
  onChatMessage: (payload: ChatMessagePayload) => void;
}

// Subscribes to the Supabase Realtime broadcast channels for one room. Every
// game event is pushed by Route Handlers (app/api/rooms/**) via
// lib/supabase/broadcast.ts on room:<code>, which players can only receive
// on, so nobody can fake a round result. Chat is different: messages aren't
// a cheating vector, so there's nothing to validate server-side — the
// returned sendChatMessage() sends browser-to-browser with the publishable
// key on room-chat:<code>, the one topic players may also send on (see
// supabase/migrations/20261024000500_room_chat_topic.sql). Broadcast doesn't
// echo back to the sender, so the caller is expected to also append its own
// sent message locally.
export function useRoomChannel(roomCode: string | null, handlers: RoomChannelHandlers) {
  const handlersRef = useRef(handlers);
  const chatChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!roomCode) {
      chatChannelRef.current = null;
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const channel: RealtimeChannel = supabase
      .channel(`room:${roomCode}`, { config: { private: true } })
      .on("broadcast", { event: "opponent-joined" }, () => handlersRef.current.onOpponentJoined())
      .on("broadcast", { event: "player-locked-in" }, ({ payload }) => handlersRef.current.onPlayerLockedIn(payload as never))
      .on("broadcast", { event: "battle-start" }, ({ payload }) => handlersRef.current.onBattleStart(payload as never))
      .on("broadcast", { event: "round-result" }, ({ payload }) => handlersRef.current.onRoundResult(payload as never))
      .on("broadcast", { event: "opponent-move-submitted" }, () => handlersRef.current.onOpponentMoveSubmitted())
      .on("broadcast", { event: "opponent-left" }, ({ payload }) =>
        handlersRef.current.onOpponentLeft((payload ?? {}) as { forfeit?: boolean })
      )
      .on("broadcast", { event: "rematch-requested" }, ({ payload }) => handlersRef.current.onRematchRequested(payload as never))
      .on("broadcast", { event: "rematch-started" }, () => handlersRef.current.onRematchStarted())
      .subscribe(logSubscription(`room:${roomCode}`));

    const chatChannel: RealtimeChannel = supabase
      .channel(`room-chat:${roomCode}`, { config: { private: true } })
      .on("broadcast", { event: "chat-message" }, ({ payload }) => handlersRef.current.onChatMessage(payload as never))
      .subscribe(logSubscription(`room-chat:${roomCode}`));

    chatChannelRef.current = chatChannel;

    return () => {
      chatChannelRef.current = null;
      supabase.removeChannel(channel);
      supabase.removeChannel(chatChannel);
    };
  }, [roomCode]);

  function sendChatMessage(payload: ChatMessagePayload) {
    chatChannelRef.current?.send({ type: "broadcast", event: "chat-message", payload });
  }

  return { sendChatMessage };
}

// Broadcasts are silent on failure otherwise — this is the only signal that
// the client ever actually joined the channel. Check the browser console if
// round updates or chat messages aren't arriving.
function logSubscription(topic: string) {
  return (status: `${REALTIME_SUBSCRIBE_STATES}`, err?: Error) => {
    if (status === "SUBSCRIBED") {
      console.log(`[${topic}] subscribed to realtime channel`);
    } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
      console.error(`[${topic}] realtime subscription ${status}`, err);
    }
  };
}
