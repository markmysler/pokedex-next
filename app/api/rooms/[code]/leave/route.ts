import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { broadcastToRoom } from "@/lib/supabase/broadcast";

export async function POST(_request: Request, ctx: RouteContext<"/api/rooms/[code]/leave">) {
  const { code } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roomCode = code.toUpperCase();
  const supabase = getSupabaseServerClient();

  const { data: room } = await supabase
    .from("battle_rooms")
    .select("player1_id, player2_id")
    .eq("code", roomCode)
    .single();

  if (room && (room.player1_id === user.id || room.player2_id === user.id)) {
    await supabase.from("battle_rooms").update({ status: "over" }).eq("code", roomCode);
    await broadcastToRoom(roomCode, "opponent-left", {});
  }

  return NextResponse.json({ ok: true });
}
