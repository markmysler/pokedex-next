import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import type { UserPokedexData } from "@/types/pokemon";

// Shared by GET /api/user-data and the Pokedex page Server Component.
// "Caught" is derived from pokemon_instances (does the account own at least
// one instance of the species) rather than a stored toggle — see
// upgrades/02-collection-system.md. Notes stay independent of ownership.
export async function getUserPokedexData(supabase: SupabaseClient<Database>, userId: string): Promise<UserPokedexData> {
  const [notesRes, instancesRes] = await Promise.all([
    supabase.from("user_pokedex").select("pokemon_number, notes").eq("user_id", userId),
    supabase.from("pokemon_instances").select("pokemon_number").eq("user_id", userId),
  ]);

  if (notesRes.error) throw new Error(notesRes.error.message);
  if (instancesRes.error) throw new Error(instancesRes.error.message);

  const caughtNumbers = new Set(instancesRes.data.map((row) => row.pokemon_number));

  const result: UserPokedexData = {};
  for (const number of caughtNumbers) {
    result[number] = { acquired: true, notes: "" };
  }
  for (const row of notesRes.data) {
    result[row.pokemon_number] = {
      acquired: caughtNumbers.has(row.pokemon_number),
      notes: row.notes,
    };
  }

  return result;
}
