import { NextResponse } from "next/server";
import { readAnonId } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getPokemon } from "@/lib/pokedex";

export async function PATCH(request: Request, ctx: RouteContext<"/api/user-data/[number]">) {
  const { number } = await ctx.params;
  if (!getPokemon(number)) return NextResponse.json({ error: "Unknown Pokemon number" }, { status: 404 });

  const anonId = await readAnonId();
  if (!anonId) return NextResponse.json({ error: "Missing anon_id" }, { status: 400 });

  const body = await request.json();
  const update: { anon_id: string; pokemon_number: string; acquired?: boolean; notes?: string } = {
    anon_id: anonId,
    pokemon_number: number,
  };
  if (typeof body.acquired === "boolean") update.acquired = body.acquired;
  if (typeof body.notes === "string") update.notes = body.notes;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_pokedex")
    .upsert(update, { onConflict: "anon_id,pokemon_number" })
    .select("acquired, notes")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
