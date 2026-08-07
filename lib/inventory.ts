import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import type { Lootbox, OwnedPokemon } from "@/types/pokemon";
import { getPokemon } from "@/lib/pokedex";
import { toOwnedPokemon } from "@/lib/collection";

// Shared by GET /api/inventory and the Server Components that need the same
// data (app/(app)/inventory, /battle, /online) — one query, no duplicated
// fetch-and-map logic across route handler and pages.
export async function getInventoryForUser(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{ pokemon: OwnedPokemon[]; lootboxes: Lootbox[] }> {
  const [instancesRes, lootboxesRes] = await Promise.all([
    supabase.from("pokemon_instances").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("lootboxes").select("*").eq("user_id", userId).is("opened_at", null).order("created_at", { ascending: true }),
  ]);

  if (instancesRes.error) throw new Error(instancesRes.error.message);
  if (lootboxesRes.error) throw new Error(lootboxesRes.error.message);

  const pokemon: OwnedPokemon[] = [];
  for (const row of instancesRes.data) {
    const species = getPokemon(row.pokemon_number);
    if (species) pokemon.push(toOwnedPokemon(row, species));
  }

  const lootboxes: Lootbox[] = lootboxesRes.data.map((row) => ({
    id: row.id,
    openedAt: row.opened_at,
    createdAt: row.created_at,
  }));

  return { pokemon, lootboxes };
}

// Fetches a pokemon_instances row and returns it as an OwnedPokemon only if
// it belongs to `userId` — ownership and existence are checked in the same
// query, so a mismatched owner and a nonexistent id look identical (null),
// same as the DELETE /api/inventory/pokemon/[id] pattern. Used everywhere a
// Route Handler needs to trust a client-supplied instance id (rooms
// create/join) — never trust the client on which Pokemon it is or its stats.
export async function getOwnedPokemonInstance(
  supabase: SupabaseClient<Database>,
  userId: string,
  instanceId: string
): Promise<OwnedPokemon | null> {
  const { data, error } = await supabase
    .from("pokemon_instances")
    .select("*")
    .eq("id", instanceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  const species = getPokemon(data.pokemon_number);
  if (!species) return null;

  return toOwnedPokemon(data, species);
}
