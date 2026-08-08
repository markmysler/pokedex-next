import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getFriendshipForUser } from "@/lib/friends";
import { getOwnedPokemonInstances } from "@/lib/inventory";
import { broadcastToFriendship, broadcastToUser } from "@/lib/supabase/broadcast";
import { createNotification } from "@/lib/notifications";
import type { Json } from "@/types/supabase";

// A cheap pre-check here gives a fast, specific error message before even
// touching the database — the same "pre-check + the real enforcement lives
// elsewhere" split step 14's trade-up uses, except here the real enforcement
// is accept_trade() at accept time (an inventory can change between offer
// and accept), not this insert.
export async function POST(request: Request, ctx: RouteContext<"/api/friends/[id]/trade">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const offeredIds = body.offeredInstanceIds as string[] | undefined;
  const requestedIds = body.requestedInstanceIds as string[] | undefined;
  if (!Array.isArray(offeredIds) || offeredIds.length === 0) {
    return NextResponse.json({ error: "Offer at least one Pokemon" }, { status: 400 });
  }
  if (!Array.isArray(requestedIds) || requestedIds.length === 0) {
    return NextResponse.json({ error: "Request at least one Pokemon" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const friendship = await getFriendshipForUser(supabase, id, user.id);
  if (!friendship) return NextResponse.json({ error: "Friendship not found" }, { status: 404 });
  if (friendship.status !== "accepted") {
    return NextResponse.json({ error: "You can only trade with accepted friends" }, { status: 403 });
  }

  const myPokemon = await getOwnedPokemonInstances(supabase, user.id, offeredIds);
  if (!myPokemon) return NextResponse.json({ error: "You don't own all of the Pokemon you're offering" }, { status: 403 });
  if (myPokemon.some((p) => p.isStarter)) {
    return NextResponse.json({ error: "Starters can't be offered in a trade" }, { status: 400 });
  }

  const theirPokemon = await getOwnedPokemonInstances(supabase, friendship.otherUserId, requestedIds);
  if (!theirPokemon) return NextResponse.json({ error: "Your friend doesn't own all of the Pokemon you're requesting" }, { status: 403 });
  if (theirPokemon.some((p) => p.isStarter)) {
    return NextResponse.json({ error: "Starters can't be requested in a trade" }, { status: 400 });
  }

  const { data: trade, error: insertError } = await supabase
    .from("trade_offers")
    .insert({
      friendship_id: id,
      offered_by: user.id,
      offered_instance_ids: offeredIds as unknown as Json,
      requested_instance_ids: requestedIds as unknown as Json,
    })
    .select("id")
    .single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  const { data: myProfile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).single();
  const fromDisplayName = myProfile?.display_name ?? "Someone";

  await broadcastToFriendship(id, "trade-offer", { tradeId: trade.id, fromDisplayName });
  const notifyPayload = { friendshipId: id, tradeId: trade.id, fromDisplayName };
  await broadcastToUser(friendship.otherUserId, "trade-offer", notifyPayload);
  await createNotification(supabase, friendship.otherUserId, "trade-offer", notifyPayload);

  return NextResponse.json({ ok: true, tradeId: trade.id });
}
