import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getPokemon } from "@/lib/pokedex";
import { buildFighterState } from "@/lib/battleEngine";
import { broadcastToRoom } from "@/lib/supabase/broadcast";
import type { RoomState } from "@/types/pokemon";
import type { Json } from "@/types/supabase";

export async function POST(request: Request, ctx: RouteContext<"/api/rooms/[code]/join">) {
  const { code } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const fighterNumber = body.fighterNumber as string | undefined;
  if (!fighterNumber || !getPokemon(fighterNumber)) {
    return NextResponse.json({ error: "Unknown fighter" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const roomCode = code.toUpperCase();

  const { data: room, error: fetchError } = await supabase
    .from("battle_rooms")
    .select("*")
    .eq("code", roomCode)
    .single();

  if (fetchError || !room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.player2_id) return NextResponse.json({ error: "Room is full" }, { status: 409 });

  const state: RoomState = {
    fighter1: buildFighterState(getPokemon(room.player1_fighter)),
    fighter2: buildFighterState(getPokemon(fighterNumber)),
    pending: {},
    turnCount: 0,
    over: false,
    winner: null,
  };

  const { error: updateError } = await supabase
    .from("battle_rooms")
    .update({
      player2_id: user.id,
      player2_fighter: fighterNumber,
      status: "battling",
      state: state as unknown as Json,
    })
    .eq("code", roomCode);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await broadcastToRoom(roomCode, "battle-start", { fighter1: state.fighter1, fighter2: state.fighter2 });

  return NextResponse.json({ roomCode, playerId: user.id, slot: 2, state });
}
