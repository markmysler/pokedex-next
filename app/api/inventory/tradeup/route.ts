import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getOwnedPokemonInstances } from "@/lib/inventory";

const TRADEUP_COUNT = 5;

// Burns 5 owned, non-starter Pokemon for exactly 1 lootbox
// (upgrades/14-pokemon-tradeup.md). getOwnedPokemonInstances() here is only
// a cheap pre-check for a fast, specific error message -- trade_up_pokemon()
// re-validates ownership and starter-status itself inside a single
// transaction, which is what actually enforces correctness against a race
// (e.g. one of the 5 gets discarded elsewhere between picking and confirming).
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const ids: unknown = body.pokemonInstanceIds;
  if (!Array.isArray(ids) || ids.length !== TRADEUP_COUNT || !ids.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: `Exactly ${TRADEUP_COUNT} Pokemon are required` }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const instances = await getOwnedPokemonInstances(supabase, user.id, ids);
  if (!instances) return NextResponse.json({ error: "One or more Pokemon are not eligible" }, { status: 404 });
  if (instances.some((p) => p.isStarter)) {
    return NextResponse.json({ error: "Starters can't be traded up" }, { status: 400 });
  }

  const { data: lootboxId, error } = await supabase.rpc("trade_up_pokemon", {
    p_user_id: user.id,
    p_instance_ids: ids,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, lootboxId });
}
