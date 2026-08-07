import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { broadcastToRoom } from "@/lib/supabase/broadcast";
import type { RoomSlot, RoomState } from "@/types/pokemon";
import type { Json } from "@/types/supabase";

// Either player can request a rematch once the battle is over — this just
// flags the request (via state.rematchRequestedBy) and notifies the other
// player; nothing resets until they explicitly accept (see ./accept).
export async function POST(_request: Request, ctx: RouteContext<"/api/rooms/[code]/rematch/request">) {
  const { code } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  if (room.status !== "over") {
    return NextResponse.json({ error: "Rematch can only be requested once the battle is over" }, { status: 409 });
  }

  const state = room.state as unknown as RoomState;
  const newState: RoomState = { ...state, rematchRequestedBy: mySlot };

  const { error: updateError } = await supabase
    .from("battle_rooms")
    .update({ state: newState as unknown as Json })
    .eq("code", roomCode);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await broadcastToRoom(roomCode, "rematch-requested", { slot: mySlot });

  return NextResponse.json({ ok: true, requestedBy: mySlot });
}
