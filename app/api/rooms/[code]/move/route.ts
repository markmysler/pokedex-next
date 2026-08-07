import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { resolveRound } from "@/lib/battleEngine";
import { broadcastToRoom } from "@/lib/supabase/broadcast";
import type { RoomSlot, RoomState } from "@/types/pokemon";
import type { Json } from "@/types/supabase";

export async function POST(request: Request, ctx: RouteContext<"/api/rooms/[code]/move">) {
  const { code } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const moveIndex = body.moveIndex as number | undefined;
  if (typeof moveIndex !== "number") return NextResponse.json({ error: "Invalid move" }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const roomCode = code.toUpperCase();

  const { data: room, error: fetchError } = await supabase
    .from("battle_rooms")
    .select("*")
    .eq("code", roomCode)
    .single();
  if (fetchError || !room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  let mySlot: RoomSlot;
  if (room.player1_id === user.id) mySlot = 1;
  else if (room.player2_id === user.id) mySlot = 2;
  else return NextResponse.json({ error: "Not a player in this room" }, { status: 403 });

  const state = room.state as unknown as RoomState;
  if (room.status !== "battling" || state.over) {
    return NextResponse.json({ error: "Battle not active" }, { status: 409 });
  }

  const myFighter = mySlot === 1 ? state.fighter1 : state.fighter2;
  const move = myFighter.pokemon.moves[moveIndex];
  if (!move) return NextResponse.json({ error: "Invalid move" }, { status: 400 });

  const cost = move.mana_cost ?? 10;
  if (myFighter.mp < cost) return NextResponse.json({ error: "Not enough Mana" }, { status: 400 });

  // Atomic: records this player's move without a read-modify-write race.
  const { data: mergedStateRaw, error: rpcError } = await supabase.rpc("submit_move", {
    p_code: roomCode,
    p_slot: mySlot,
    p_move: move as unknown as Json,
  });
  if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 500 });
  const mergedState = mergedStateRaw as unknown as RoomState;

  const pending = mergedState.pending;
  const move1 = pending[1];
  const move2 = pending[2];
  if (!move1 || !move2) {
    // Only one player has moved so far — let the other player know, but
    // there's nothing to resolve yet.
    await broadcastToRoom(roomCode, "opponent-move-submitted", {});
    return NextResponse.json({ ok: true, waiting: true });
  }

  const fighter1State = mergedState.fighter1;
  const fighter2State = mergedState.fighter2;
  const nextTurn = state.turnCount + 1;
  const result = resolveRound(fighter1State, fighter2State, move1, move2);

  const newState: RoomState = {
    fighter1: fighter1State,
    fighter2: fighter2State,
    pending: {},
    turnCount: nextTurn,
    over: result.over,
    winner: result.winner,
  };

  const { error: finalizeError } = await supabase.rpc("finalize_round", {
    p_code: roomCode,
    p_new_state: newState as unknown as Json,
  });
  if (finalizeError) return NextResponse.json({ error: finalizeError.message }, { status: 500 });

  if (result.over) {
    await supabase.from("battle_rooms").update({ status: "over" }).eq("code", roomCode);
  }

  const roundResultPayload = {
    log: result.log,
    turnCount: nextTurn,
    fighter1: fighter1State,
    fighter2: fighter2State,
    over: result.over,
    winner: result.winner,
  };

  // Push to the other player via Realtime (best-effort, never throws — see
  // broadcastToRoom). The submitting player doesn't depend on this at all:
  // they get the same payload directly in this response below.
  await broadcastToRoom(roomCode, "round-result", roundResultPayload);

  return NextResponse.json({ ok: true, resolved: true, ...roundResultPayload });
}
