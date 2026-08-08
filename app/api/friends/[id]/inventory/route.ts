import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getFriendshipForUser } from "@/lib/friends";
import { getInventoryForUser } from "@/lib/inventory";

// Read-only view of an accepted friend's owned Pokemon, for the trade
// builder's "pick from their side" grid (upgrades/12-friend-chat-trading.md)
// — only what's needed to pick from (id/species/stats/moves), fetched
// specifically for this screen rather than exposing any other account data.
export async function GET(_request: Request, ctx: RouteContext<"/api/friends/[id]/inventory">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();

  const friendship = await getFriendshipForUser(supabase, id, user.id);
  if (!friendship) return NextResponse.json({ error: "Friendship not found" }, { status: 404 });
  if (friendship.status !== "accepted") {
    return NextResponse.json({ error: "You can only view an accepted friend's inventory" }, { status: 403 });
  }

  const { pokemon } = await getInventoryForUser(supabase, friendship.otherUserId);
  return NextResponse.json({ pokemon });
}
