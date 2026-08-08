import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getFriendshipForUser } from "@/lib/friends";
import { broadcastToFriendship, broadcastToUser } from "@/lib/supabase/broadcast";

// Same endpoint for both outcomes -- "cancel" from the side that proposed
// it, "decline" from the other side (upgrades/12-friend-chat-trading.md).
// No ownership change either way, so no accept_trade()-style atomic RPC is
// needed -- a single status column update is enough.
export async function POST(_request: Request, ctx: RouteContext<"/api/friends/trade/[id]/decline">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();

  const { data: trade, error: fetchError } = await supabase.from("trade_offers").select("*").eq("id", id).maybeSingle();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!trade) return NextResponse.json({ error: "Trade not found" }, { status: 404 });

  const friendship = await getFriendshipForUser(supabase, trade.friendship_id, user.id);
  if (!friendship) return NextResponse.json({ error: "Not a party to this trade" }, { status: 403 });

  if (trade.status !== "pending") {
    return NextResponse.json({ error: "This trade is no longer pending" }, { status: 409 });
  }

  const status = trade.offered_by === user.id ? "cancelled" : "declined";
  const { error: updateError } = await supabase
    .from("trade_offers")
    .update({ status, resolved_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending"); // atomic guard against a concurrent accept/decline
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await broadcastToFriendship(trade.friendship_id, "trade-resolved", { tradeId: id, status });
  await broadcastToUser(friendship.otherUserId, "trade-resolved", { friendshipId: trade.friendship_id, tradeId: id, status });

  return NextResponse.json({ ok: true, status });
}
