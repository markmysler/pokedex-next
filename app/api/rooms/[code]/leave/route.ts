import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { broadcastToRoom } from "@/lib/supabase/broadcast";
import { teamSnapshot } from "@/lib/history";
import type { RoomSlot, RoomState } from "@/types/pokemon";
import type { Json } from "@/types/supabase";

export async function POST(_request: Request, ctx: RouteContext<"/api/rooms/[code]/leave">) {
  const { code } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roomCode = code.toUpperCase();
  const supabase = getSupabaseServerClient();

  const { data: room } = await supabase
    .from("battle_rooms")
    .select("player1_id, player2_id, status, state")
    .eq("code", roomCode)
    .single();

  if (!room || (room.player1_id !== user.id && room.player2_id !== user.id)) {
    return NextResponse.json({ ok: true });
  }

  const state = room.state as unknown as RoomState;
  let forfeit = false;
  if (room.status === "battling" && !state.over && room.player2_id) {
    // Leaving a live battle is a forfeit: the opponent wins, gets the usual
    // lootbox, and both sides get a match_results row. Before, leaving just
    // ended the room with no result, so walking out of a losing battle cost
    // nothing. record_online_battle_end applies this only if the battle
    // hasn't already ended, so it can't overwrite a real final round.
    const mySlot: RoomSlot = room.player1_id === user.id ? 1 : 2;
    const winner: RoomSlot = mySlot === 1 ? 2 : 1;
    const winnerId = winner === 1 ? room.player1_id : room.player2_id;
    const finalState: RoomState = { ...state, pending: {}, over: true, winner, awaitingForcedSwitch: null };
    const { data, error } = await supabase.rpc("record_online_battle_end", {
      p_code: roomCode,
      p_winner_id: winnerId,
      p_loser_id: user.id,
      p_winner_team: teamSnapshot(winner === 1 ? state.team1 : state.team2) as unknown as Json,
      p_loser_team: teamSnapshot(winner === 1 ? state.team2 : state.team1) as unknown as Json,
      p_final_state: finalState as unknown as Json,
    });
    if (error) console.error(`forfeit in ${roomCode} failed:`, error);
    forfeit = Boolean((data as { recorded?: boolean } | null)?.recorded);
  } else {
    await supabase.from("battle_rooms").update({ status: "over" }).eq("code", roomCode);
  }

  await broadcastToRoom(roomCode, "opponent-left", { forfeit });
  return NextResponse.json({ ok: true });
}
