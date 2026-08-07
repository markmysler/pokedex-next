import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import type { UserPokedexData } from "@/types/pokemon";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_pokedex")
    .select("pokemon_number, acquired, notes")
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result: UserPokedexData = {};
  for (const row of data) {
    result[row.pokemon_number] = { acquired: row.acquired, notes: row.notes };
  }
  return NextResponse.json(result);
}
