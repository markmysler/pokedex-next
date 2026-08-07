import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getPokemon } from "@/lib/pokedex";

// `acquired` is no longer a writable field — ownership is derived from
// pokemon_instances (see GET /api/user-data). A body with only `acquired`
// (the not-yet-reworked Pokedex tab checkbox, removed in
// upgrades/04-app-shell-navigation.md) is accepted-but-ignored rather than
// rejected, so that UI doesn't hard-error before it's replaced.
export async function PATCH(request: Request, ctx: RouteContext<"/api/user-data/[number]">) {
  const { number } = await ctx.params;
  if (!getPokemon(number)) return NextResponse.json({ error: "Unknown Pokemon number" }, { status: 404 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const supabase = getSupabaseServerClient();

  if (typeof body.notes !== "string") {
    const { data, error } = await supabase
      .from("user_pokedex")
      .select("notes")
      .eq("user_id", user.id)
      .eq("pokemon_number", number)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ notes: data?.notes ?? "" });
  }

  const { data, error } = await supabase
    .from("user_pokedex")
    .upsert({ user_id: user.id, pokemon_number: number, notes: body.notes }, { onConflict: "user_id,pokemon_number" })
    .select("notes")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
