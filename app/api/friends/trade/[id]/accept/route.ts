import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { broadcastToFriendship, broadcastToUser } from "@/lib/supabase/broadcast";

// Accepting is a real, irreversible ownership transfer — the actual
// validation (still pending? every id still owned by the expected account?)
// happens inside accept_trade() itself, atomically, not here. This handler
// is just auth + surfacing whichever specific failure the function raises
// (upgrades/12-friend-chat-trading.md).
export async function POST(_request: Request, ctx: RouteContext<"/api/friends/trade/[id]/accept">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();

  const { data: trade, error: fetchError } = await supabase.from("trade_offers").select("*").eq("id", id).maybeSingle();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!trade) return NextResponse.json({ error: "Trade not found" }, { status: 404 });

  const { error: rpcError } = await supabase.rpc("accept_trade", { p_trade_id: id, p_accepting_user_id: user.id });
  if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 400 });

  await broadcastToFriendship(trade.friendship_id, "trade-resolved", { tradeId: id, status: "accepted" });
  await broadcastToUser(trade.offered_by, "trade-resolved", { friendshipId: trade.friendship_id, tradeId: id, status: "accepted" });

  return NextResponse.json({ ok: true });
}
