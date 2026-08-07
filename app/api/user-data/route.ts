import { NextResponse } from "next/server";
import { readAnonId } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import type { UserPokedexData } from "@/types/pokemon";

export async function GET() {
  const anonId = await readAnonId();
  if (!anonId) return NextResponse.json({ error: "Missing anon_id" }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_pokedex")
    .select("pokemon_number, acquired, notes")
    .eq("anon_id", anonId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result: UserPokedexData = {};
  for (const row of data) {
    result[row.pokemon_number] = { acquired: row.acquired, notes: row.notes };
  }
  return NextResponse.json(result);
}
