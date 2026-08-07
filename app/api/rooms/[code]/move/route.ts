import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { resolveTeamRound } from "@/lib/battleEngine";
import { broadcastToRoom } from "@/lib/supabase/broadcast";
import type { BattleAction, RoomSlot, RoomState, TeamState } from "@/types/pokemon";
import type { Database, Json } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

function validateAction(action: BattleAction, team: TeamState): string | null {
  if (action.type === "attack") {
    const active = team.members[team.activeIndex];
    if (active.hp <= 0) return "Your active Pokemon has fainted";
    const move = active.pokemon.moves[action.moveIndex];
    if (!move) return "Invalid move";
    const cost = move.mana_cost ?? 10;
    if (active.mp < cost) return "Not enough Mana";
    return null;
  }
  if (action.type === "switch") {
    const target = team.members[action.teamIndex];
    if (!target) return "Invalid team slot";
    if (action.teamIndex === team.activeIndex) return "That Pokemon is already active";
    if (target.hp <= 0) return "That Pokemon has fainted";
    return null;
  }
  return "Invalid action";
}

// Lightweight {number, name}[] copy, not owned-instance ids — cheap to snapshot
// now and doesn't go stale if the instance is later discarded (see
// upgrades/07-match-history-leaderboard.md).
function teamSnapshot(team: TeamState): { number: string; name: string }[] {
  return team.members.map((m) => ({ number: m.pokemon.number, name: m.pokemon.name }));
}

async function recordBattleEnd(
  supabase: SupabaseClient<Database>,
  roomCode: string,
  room: { player1_id: string; player2_id: string | null },
  winner: RoomSlot,
  team1: TeamState,
  team2: TeamState
) {
  await supabase.from("battle_rooms").update({ status: "over" }).eq("code", roomCode);

  const winnerId = winner === 1 ? room.player1_id : room.player2_id;
  const loserId = winner === 1 ? room.player2_id : room.player1_id;
  const winnerTeam = winner === 1 ? team1 : team2;
  const loserTeam = winner === 1 ? team2 : team1;

  // Winner gets a lootbox every time (100%, unconditional — unlike bot
  // battles' 25% roll). Both players get a match_results row so each
  // account's own history/dashboard reflects the result.
  if (winnerId) await supabase.from("lootboxes").insert({ user_id: winnerId });
  if (winnerId) {
    await supabase.from("match_results").insert({
      user_id: winnerId,
      opponent: loserId ?? "unknown",
      mode: "online",
      won: true,
      room_code: roomCode,
      team_snapshot: teamSnapshot(winnerTeam) as unknown as Json,
    });
  }
  if (loserId) {
    await supabase.from("match_results").insert({
      user_id: loserId,
      opponent: winnerId ?? "unknown",
      mode: "online",
      won: false,
      room_code: roomCode,
      team_snapshot: teamSnapshot(loserTeam) as unknown as Json,
    });
  }
}

export async function POST(request: Request, ctx: RouteContext<"/api/rooms/[code]/move">) {
  const { code } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const action = body.action as BattleAction | undefined;
  if (!action || (action.type !== "attack" && action.type !== "switch")) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
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

  const state = room.state as unknown as RoomState;
  if (room.status !== "battling" || state.over) {
    return NextResponse.json({ error: "Battle not active" }, { status: 409 });
  }

  // --- Forced switch: only the side whose active fainted may act, and only
  // with a switch — the other player just waits this micro-turn out. ---
  if (state.awaitingForcedSwitch) {
    if (state.awaitingForcedSwitch !== mySlot) {
      return NextResponse.json({ error: "Waiting for your opponent to send out a new Pokemon" }, { status: 409 });
    }
    if (action.type !== "switch") {
      return NextResponse.json({ error: "You must switch in a new Pokemon" }, { status: 400 });
    }

    const myTeam = mySlot === 1 ? state.team1 : state.team2;
    const validationError = validateAction(action, myTeam);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    const fromName = myTeam.members[myTeam.activeIndex].pokemon.name;
    const toName = myTeam.members[action.teamIndex].pokemon.name;
    myTeam.activeIndex = action.teamIndex;

    const newState: RoomState = { ...state, awaitingForcedSwitch: null, turnCount: state.turnCount + 1 };

    const { error: finalizeError } = await supabase.rpc("finalize_round", {
      p_code: roomCode,
      p_new_state: newState as unknown as Json,
    });
    if (finalizeError) return NextResponse.json({ error: finalizeError.message }, { status: 500 });

    const payload = {
      log: [`↩️ ${fromName} is withdrawn! ${toName}, go!`],
      turnCount: newState.turnCount,
      team1: newState.team1,
      team2: newState.team2,
      awaitingForcedSwitch: null,
      over: false,
      winner: null,
    };
    await broadcastToRoom(roomCode, "round-result", payload);
    return NextResponse.json({ ok: true, resolved: true, ...payload });
  }

  // --- Normal turn: both players submit an action, then the round resolves. ---
  const myTeam = mySlot === 1 ? state.team1 : state.team2;
  const validationError = validateAction(action, myTeam);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  // Atomic: records this player's action without a read-modify-write race.
  const { data: mergedStateRaw, error: rpcError } = await supabase.rpc("submit_move", {
    p_code: roomCode,
    p_slot: mySlot,
    p_move: action as unknown as Json,
  });
  if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 500 });
  const mergedState = mergedStateRaw as unknown as RoomState;

  const action1 = mergedState.pending[1];
  const action2 = mergedState.pending[2];
  if (!action1 || !action2) {
    // Only one player has acted so far — let the other player know, but
    // there's nothing to resolve yet.
    await broadcastToRoom(roomCode, "opponent-move-submitted", {});
    return NextResponse.json({ ok: true, waiting: true });
  }

  const team1 = mergedState.team1;
  const team2 = mergedState.team2;
  const nextTurn = state.turnCount + 1;
  const result = resolveTeamRound(team1, team2, action1, action2);

  const newState: RoomState = {
    team1,
    team2,
    pending: {},
    awaitingForcedSwitch: result.awaitingForcedSwitch,
    turnCount: nextTurn,
    over: result.over,
    winner: result.winner,
  };

  const { error: finalizeError } = await supabase.rpc("finalize_round", {
    p_code: roomCode,
    p_new_state: newState as unknown as Json,
  });
  if (finalizeError) return NextResponse.json({ error: finalizeError.message }, { status: 500 });

  if (result.over && result.winner) {
    await recordBattleEnd(supabase, roomCode, room, result.winner, team1, team2);
  }

  const roundResultPayload = {
    log: result.log,
    turnCount: nextTurn,
    team1,
    team2,
    awaitingForcedSwitch: result.awaitingForcedSwitch,
    over: result.over,
    winner: result.winner,
  };

  // Push to the other player via Realtime (best-effort, never throws — see
  // broadcastToRoom). The submitting player doesn't depend on this at all:
  // they get the same payload directly in this response below.
  await broadcastToRoom(roomCode, "round-result", roundResultPayload);

  return NextResponse.json({ ok: true, resolved: true, ...roundResultPayload });
}
