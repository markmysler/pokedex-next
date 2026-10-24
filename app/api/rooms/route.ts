import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { serverError } from "@/lib/http";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { generateRoomCode } from "@/lib/roomCode";

const MAX_ATTEMPTS = 5;
// Rooms people walked away from are never cleaned up otherwise; anything
// older than this is long finished or abandoned (results live in
// match_results, not in the room).
const ROOM_TTL_MS = 24 * 60 * 60 * 1000;

// Team composition is decided in the picking phase after both players are
// seated (see [code]/lock-in) — creating a room no longer takes a Pokemon.
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();

  // Best-effort housekeeping on every new room: a failure here mustn't stop
  // the player creating one.
  const cutoff = new Date(Date.now() - ROOM_TTL_MS).toISOString();
  const { error: cleanupError } = await supabase.from("battle_rooms").delete().lt("created_at", cutoff);
  if (cleanupError) console.error("stale battle_rooms cleanup failed:", cleanupError);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = generateRoomCode();
    const { error } = await supabase.from("battle_rooms").insert({
      code,
      player1_id: user.id,
      status: "waiting_for_players",
      state: {},
    });

    if (!error) {
      return NextResponse.json({ roomCode: code, playerId: user.id, slot: 1 });
    }
    // 23505 = unique_violation (room code collision) — regenerate and retry.
    if (error.code !== "23505") {
      return serverError("rooms", error);
    }
  }

  return NextResponse.json({ error: "Could not allocate a room code, try again" }, { status: 500 });
}
