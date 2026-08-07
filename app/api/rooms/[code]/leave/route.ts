import { NextResponse } from "next/server";
import { readAnonId } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { broadcastToRoom } from "@/lib/supabase/broadcast";

export async function POST(_request: Request, ctx: RouteContext<"/api/rooms/[code]/leave">) {
  const { code } = await ctx.params;
  const anonId = await readAnonId();
  if (!anonId) return NextResponse.json({ error: "Missing anon_id" }, { status: 400 });

  const roomCode = code.toUpperCase();
  const supabase = getSupabaseServerClient();

  const { data: room } = await supabase
    .from("battle_rooms")
    .select("player1_id, player2_id")
    .eq("code", roomCode)
    .single();

  if (room && (room.player1_id === anonId || room.player2_id === anonId)) {
    await supabase.from("battle_rooms").update({ status: "over" }).eq("code", roomCode);
    await broadcastToRoom(roomCode, "opponent-left", {});
  }

  return NextResponse.json({ ok: true });
}
