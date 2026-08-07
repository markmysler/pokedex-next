import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import type { RoomState } from "@/types/pokemon";

// Polling backstop for clients: Realtime broadcasts are the fast path for
// pushing round results, but a client can call this at any time to fetch
// the room's authoritative current state directly, so the game never gets
// permanently stuck if a broadcast doesn't arrive.
export async function GET(_request: Request, ctx: RouteContext<"/api/rooms/[code]">) {
  const { code } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const roomCode = code.toUpperCase();

  const { data: room, error } = await supabase
    .from("battle_rooms")
    .select("*")
    .eq("code", roomCode)
    .single();
  if (error || !room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  if (room.player1_id !== user.id && room.player2_id !== user.id) {
    return NextResponse.json({ error: "Not a player in this room" }, { status: 403 });
  }

  const state = room.state as unknown as RoomState;
  return NextResponse.json({ roomCode, status: room.status, state });
}
