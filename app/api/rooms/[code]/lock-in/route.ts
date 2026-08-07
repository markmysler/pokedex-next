import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getOwnedPokemonInstances } from "@/lib/inventory";
import { buildTeamState } from "@/lib/battleEngine";
import { broadcastToRoom } from "@/lib/supabase/broadcast";
import type { RoomSlot, RoomState } from "@/types/pokemon";
import type { Json } from "@/types/supabase";

const TEAM_SIZE = 3;

// Stores this player's 3 picks without exposing them to the opponent (never
// returned from GET /api/rooms/[code], never broadcast) until both players
// have locked in — at which point this same handler (whichever request gets
// there second) builds the full battle state and reveals both teams at once.
export async function POST(request: Request, ctx: RouteContext<"/api/rooms/[code]/lock-in">) {
  const { code } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const ids = body.pokemonInstanceIds as string[] | undefined;
  if (!Array.isArray(ids) || ids.length !== TEAM_SIZE) {
    return NextResponse.json({ error: `Pick exactly ${TEAM_SIZE} Pokemon` }, { status: 400 });
  }

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

  if (room.status !== "picking") {
    return NextResponse.json({ error: "This room isn't in the picking phase" }, { status: 409 });
  }

  // Never trust the client on which Pokemon these are or their stats — only
  // the ids are taken from the request; everything else is re-fetched here.
  const myTeam = await getOwnedPokemonInstances(supabase, user.id, ids);
  if (!myTeam) return NextResponse.json({ error: "You don't own all of those Pokemon" }, { status: 403 });

  const idsJson = ids as unknown as Json;
  const { error: updateError } = await supabase
    .from("battle_rooms")
    .update(mySlot === 1 ? { player1_team_ids: idsJson } : { player2_team_ids: idsJson })
    .eq("code", roomCode);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  const { data: refreshed, error: refetchError } = await supabase
    .from("battle_rooms")
    .select("*")
    .eq("code", roomCode)
    .single();
  if (refetchError || !refreshed) return NextResponse.json({ ok: true, lockedIn: true, battleStarted: false });

  const opponentIds = (mySlot === 1 ? refreshed.player2_team_ids : refreshed.player1_team_ids) as string[] | null;
  const opponentId = mySlot === 1 ? refreshed.player2_id : refreshed.player1_id;

  if (!opponentIds || !opponentId) {
    // Opponent hasn't locked in yet — let them know someone did, but there's
    // nothing to reveal.
    await broadcastToRoom(roomCode, "player-locked-in", { slot: mySlot });
    return NextResponse.json({ ok: true, lockedIn: true, battleStarted: false });
  }

  // Both locked in. Re-validate the opponent's picks too (they may have
  // discarded one between their lock-in and now — same reasoning as step 3's
  // join re-fetch) before building the battle state both sides will see.
  const opponentTeam = await getOwnedPokemonInstances(supabase, opponentId, opponentIds);
  if (!opponentTeam) {
    return NextResponse.json(
      { error: "Opponent's team is no longer valid — ask them to lock in again" },
      { status: 409 }
    );
  }

  const myTeamState = buildTeamState(myTeam);
  const opponentTeamState = buildTeamState(opponentTeam);

  const state: RoomState = {
    team1: mySlot === 1 ? myTeamState : opponentTeamState,
    team2: mySlot === 1 ? opponentTeamState : myTeamState,
    pending: {},
    awaitingForcedSwitch: null,
    turnCount: 0,
    over: false,
    winner: null,
  };

  // Atomic: only whichever request gets here first actually flips the room
  // to battling — the loser of this race (0 rows updated) doesn't broadcast
  // a duplicate battle-start.
  const { data: transitioned } = await supabase
    .from("battle_rooms")
    .update({ status: "battling", state: state as unknown as Json })
    .eq("code", roomCode)
    .eq("status", "picking")
    .select()
    .maybeSingle();

  if (transitioned) {
    await broadcastToRoom(roomCode, "battle-start", { team1: state.team1, team2: state.team2 });
    return NextResponse.json({ ok: true, lockedIn: true, battleStarted: true, state });
  }

  const { data: finalRoom } = await supabase.from("battle_rooms").select("state").eq("code", roomCode).single();
  return NextResponse.json({ ok: true, lockedIn: true, battleStarted: true, state: finalRoom?.state ?? state });
}
