import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getFriendshipForUser } from "@/lib/friends";
import { getPokemon } from "@/lib/pokedex";
import { toOwnedPokemon } from "@/lib/collection";
import type { OwnedPokemon } from "@/types/pokemon";

// Pending trades on this friendship show as their own section on the chat
// page, not mixed into the message stream (upgrades/12-friend-chat-trading.md).
export async function GET(_request: Request, ctx: RouteContext<"/api/friends/[id]/trades">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();

  const friendship = await getFriendshipForUser(supabase, id, user.id);
  if (!friendship) return NextResponse.json({ error: "Friendship not found" }, { status: 404 });
  if (friendship.status !== "accepted") {
    return NextResponse.json({ error: "You can only view trades with accepted friends" }, { status: 403 });
  }

  const { data: rows, error } = await supabase
    .from("trade_offers")
    .select("*")
    .eq("friendship_id", id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const allIds = Array.from(
    new Set((rows ?? []).flatMap((r) => [...(r.offered_instance_ids as string[]), ...(r.requested_instance_ids as string[])]))
  );

  const instanceById = new Map<string, OwnedPokemon>();
  if (allIds.length > 0) {
    const { data: instances } = await supabase.from("pokemon_instances").select("*").in("id", allIds);
    for (const row of instances ?? []) {
      const species = getPokemon(row.pokemon_number);
      if (species) instanceById.set(row.id, toOwnedPokemon(row, species));
    }
  }

  // A Pokemon involved in this trade may have been discarded/traded away
  // since the offer was made — filter(Boolean) rather than error, since
  // accept-time re-validation (accept_trade()) is what actually rejects a
  // stale offer; this list is just a preview.
  const trades = (rows ?? []).map((r) => ({
    id: r.id,
    offeredBy: r.offered_by,
    isMine: r.offered_by === user.id,
    offered: (r.offered_instance_ids as string[]).map((iid) => instanceById.get(iid)).filter((p): p is OwnedPokemon => Boolean(p)),
    requested: (r.requested_instance_ids as string[]).map((iid) => instanceById.get(iid)).filter((p): p is OwnedPokemon => Boolean(p)),
    createdAt: r.created_at,
  }));

  return NextResponse.json({ trades });
}
