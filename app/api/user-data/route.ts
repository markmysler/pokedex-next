import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import type { UserPokedexData } from "@/types/pokemon";

// "Caught" is derived from pokemon_instances (does this account own at
// least one instance of the species), not a stored toggle — see
// upgrades/02-collection-system.md. Notes stay independent of ownership.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();

  const [notesRes, instancesRes] = await Promise.all([
    supabase.from("user_pokedex").select("pokemon_number, notes").eq("user_id", user.id),
    supabase.from("pokemon_instances").select("pokemon_number").eq("user_id", user.id),
  ]);

  if (notesRes.error) return NextResponse.json({ error: notesRes.error.message }, { status: 500 });
  if (instancesRes.error) return NextResponse.json({ error: instancesRes.error.message }, { status: 500 });

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

  return NextResponse.json(result);
}
