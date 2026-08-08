import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { rollAndPersistLootboxPokemon } from "@/lib/inventory";

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

  try {
    const pokemon = await rollAndPersistLootboxPokemon(supabase, user.id);
    return NextResponse.json({ pokemon });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to open lootbox" }, { status: 500 });
  }
}
