import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { broadcastToRoom } from "@/lib/supabase/broadcast";

// Just seats the second player — team picks happen in the next phase (see
// [code]/lock-in), independently for each player.
export async function POST(_request: Request, ctx: RouteContext<"/api/rooms/[code]/join">) {
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
  if (room.player1_id === user.id) return NextResponse.json({ error: "You can't join your own room" }, { status: 409 });
  if (room.player2_id) return NextResponse.json({ error: "Room is full" }, { status: 409 });
  if (room.status !== "waiting_for_players") {
    return NextResponse.json({ error: "This room already started" }, { status: 409 });
  }

  // Atomic: the WHERE clause means only one of two concurrent join attempts
  // actually seats itself as player2 — the loser sees 0 rows updated below.
  const { data: updated, error: updateError } = await supabase
    .from("battle_rooms")
    .update({ player2_id: user.id, status: "picking" })
    .eq("code", roomCode)
    .eq("status", "waiting_for_players")
    .select()
    .maybeSingle();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  if (!updated) return NextResponse.json({ error: "Room is full" }, { status: 409 });

  await broadcastToRoom(roomCode, "opponent-joined", {});

  return NextResponse.json({ roomCode, playerId: user.id, slot: 2, status: "picking" });
}
