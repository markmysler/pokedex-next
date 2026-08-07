import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getPokemon, pokedexOrder } from "@/lib/pokedex";
import { rollInstance, toOwnedPokemon } from "@/lib/collection";
import type { Json } from "@/types/supabase";

export async function POST(_request: Request, ctx: RouteContext<"/api/inventory/lootboxes/[id]/open">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();

  // Atomic claim: only succeeds if this lootbox is still unopened, the same
  // "UPDATE ... RETURNING" pattern used for battle_rooms — closes the race
  // where opening the same lootbox twice concurrently could grant two
  // Pokemon for one box.
  const { data: claimed, error: claimError } = await supabase
    .from("lootboxes")
    .update({ opened_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("opened_at", null)
    .select("id")
    .maybeSingle();

  if (claimError) return NextResponse.json({ error: claimError.message }, { status: 500 });

  if (!claimed) {
    const { data: existing } = await supabase
      .from("lootboxes")
      .select("user_id, opened_at")
      .eq("id", id)
      .maybeSingle();
    if (!existing) return NextResponse.json({ error: "Lootbox not found" }, { status: 404 });
    if (existing.user_id !== user.id) return NextResponse.json({ error: "Not your lootbox" }, { status: 403 });
    return NextResponse.json({ error: "Lootbox already opened" }, { status: 409 });
  }

  // Species can be anything, including one already owned — duplicates are
  // intentional (see upgrades/02-collection-system.md).
  const randomNumber = pokedexOrder[Math.floor(Math.random() * pokedexOrder.length)];
  const species = getPokemon(randomNumber);
  if (!species) return NextResponse.json({ error: "Internal error rolling species" }, { status: 500 });

  const rolled = rollInstance(species);

  const { data: instanceRow, error: insertError } = await supabase
    .from("pokemon_instances")
    .insert({
      user_id: user.id,
      pokemon_number: species.number,
      hp: rolled.hp,
      atk: rolled.atk,
      def: rolled.def,
      spatk: rolled.spatk,
      spdef: rolled.spdef,
      spd: rolled.spd,
      total: rolled.total,
      moves: rolled.moves as unknown as Json,
      is_starter: false,
    })
    .select("*")
    .single();

  if (insertError || !instanceRow) {
    return NextResponse.json({ error: insertError?.message ?? "Failed to create Pokemon instance" }, { status: 500 });
  }

  return NextResponse.json({ pokemon: toOwnedPokemon(instanceRow, species) });
}
