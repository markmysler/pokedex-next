import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getPokemon } from "@/lib/pokedex";
import { toOwnedPokemon } from "@/lib/collection";
import type { Lootbox, OwnedPokemon } from "@/types/pokemon";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();

  const [instancesRes, lootboxesRes] = await Promise.all([
    supabase
      .from("pokemon_instances")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("lootboxes")
      .select("*")
      .eq("user_id", user.id)
      .is("opened_at", null)
      .order("created_at", { ascending: true }),
  ]);

  if (instancesRes.error) return NextResponse.json({ error: instancesRes.error.message }, { status: 500 });
  if (lootboxesRes.error) return NextResponse.json({ error: lootboxesRes.error.message }, { status: 500 });

  const pokemon: OwnedPokemon[] = [];
  for (const row of instancesRes.data) {
    const species = getPokemon(row.pokemon_number);
    if (!species) continue; // shouldn't happen — skip defensively rather than fail the whole list
    pokemon.push(toOwnedPokemon(row, species));
  }

  const lootboxes: Lootbox[] = lootboxesRes.data.map((row) => ({
    id: row.id,
    openedAt: row.opened_at,
    createdAt: row.created_at,
  }));

  return NextResponse.json({ pokemon, lootboxes });
}
