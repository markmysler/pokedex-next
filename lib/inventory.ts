import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import type { OwnedPokemon } from "@/types/pokemon";
import { getPokemon } from "@/lib/pokedex";
import { toOwnedPokemon } from "@/lib/collection";

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
