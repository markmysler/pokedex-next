import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getPokemon } from "@/lib/pokedex";
import { generateRoomCode } from "@/lib/roomCode";

const MAX_ATTEMPTS = 5;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const fighterNumber = body.fighterNumber as string | undefined;
  if (!fighterNumber || !getPokemon(fighterNumber)) {
    return NextResponse.json({ error: "Unknown fighter" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = generateRoomCode();
    const { error } = await supabase.from("battle_rooms").insert({
      code,
      player1_id: user.id,
      player1_fighter: fighterNumber,
      status: "waiting",
      state: {},
    });

    if (!error) {
      return NextResponse.json({ roomCode: code, playerId: user.id, slot: 1 });
    }
    // 23505 = unique_violation (room code collision) — regenerate and retry.
    if (error.code !== "23505") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Could not allocate a room code, try again" }, { status: 500 });
}
