import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getOwnedPokemonInstance } from "@/lib/inventory";
import { generateRoomCode } from "@/lib/roomCode";

const MAX_ATTEMPTS = 5;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const pokemonInstanceId = body.pokemonInstanceId as string | undefined;
  if (!pokemonInstanceId) return NextResponse.json({ error: "Missing pokemonInstanceId" }, { status: 400 });

  const supabase = getSupabaseServerClient();

  // Never trust the client on which Pokemon it is or its stats — only the
  // id is taken from the request; everything else is re-fetched here.
  const owned = await getOwnedPokemonInstance(supabase, user.id, pokemonInstanceId);
  if (!owned) return NextResponse.json({ error: "You don't own that Pokemon" }, { status: 403 });

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = generateRoomCode();
    const { error } = await supabase.from("battle_rooms").insert({
      code,
      player1_id: user.id,
      player1_pokemon_instance_id: pokemonInstanceId,
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
