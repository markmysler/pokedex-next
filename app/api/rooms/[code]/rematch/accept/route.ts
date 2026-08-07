import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { broadcastToRoom } from "@/lib/supabase/broadcast";
import type { RoomSlot, RoomState } from "@/types/pokemon";
import type { Json } from "@/types/supabase";

// The *other* player (not whoever requested) confirms a pending rematch.
// Resets the existing battle_rooms row in place — same code, same row, back
// to the picking phase, so step 5's TeamPicker/lock-in flow runs again.
export async function POST(_request: Request, ctx: RouteContext<"/api/rooms/[code]/rematch/accept">) {
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
    return NextResponse.json({ error: "No rematch to accept" }, { status: 409 });
  }

  const state = room.state as unknown as RoomState;
  const requestedBy = state.rematchRequestedBy;
  if (!requestedBy) return NextResponse.json({ error: "No pending rematch request" }, { status: 409 });
  if (requestedBy === mySlot) return NextResponse.json({ error: "Wait for your opponent to accept" }, { status: 409 });

  // Atomic: the WHERE clause means only one accept actually resets the room
  // — a second, racing accept (or an accept after the requester left) sees
  // 0 rows updated.
  const { data: updated, error: updateError } = await supabase
    .from("battle_rooms")
    .update({
      status: "picking",
      state: {} as unknown as Json,
      player1_team_ids: null,
      player2_team_ids: null,
    })
    .eq("code", roomCode)
    .eq("status", "over")
    .select()
    .maybeSingle();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  if (!updated) return NextResponse.json({ error: "Rematch request is no longer valid" }, { status: 409 });

  await broadcastToRoom(roomCode, "rematch-started", {});

  return NextResponse.json({ ok: true, status: "picking" });
}
