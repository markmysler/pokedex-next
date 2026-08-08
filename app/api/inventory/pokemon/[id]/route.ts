import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

const NICKNAME_MAX_LENGTH = 24;

// Renames (or clears) one owned Pokemon instance's nickname
// (upgrades/08-pokemon-nicknames.md). Blank/whitespace-only clears it back
// to null rather than storing an empty string, so displayName() only has
// one falsy case to check.
export async function PATCH(request: Request, ctx: RouteContext<"/api/inventory/pokemon/[id]">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  if (body.nickname !== null && typeof body.nickname !== "string") {
    return NextResponse.json({ error: "nickname must be a string or null" }, { status: 400 });
  }

  const trimmed = typeof body.nickname === "string" ? body.nickname.trim() : "";
  if (trimmed.length > NICKNAME_MAX_LENGTH) {
    return NextResponse.json({ error: `Nickname must be ${NICKNAME_MAX_LENGTH} characters or fewer` }, { status: 400 });
  }
  const nickname = trimmed.length > 0 ? trimmed : null;

  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("pokemon_instances")
    .update({ nickname })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Pokemon not found" }, { status: 404 });

  return NextResponse.json({ ok: true, nickname });
}

// The "discard" action — removes an owned Pokemon instance permanently.
export async function DELETE(_request: Request, ctx: RouteContext<"/api/inventory/pokemon/[id]">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();

  // Scoping the delete to user_id + is_starter=false in the query itself
  // (not a separate fetch-then-check) means a mismatched owner or a starter
  // just deletes zero rows rather than needing a second round trip for the
  // common (successful) case. Starters are fixed gear, never releasable --
  // same reasoning trade-up (step 14) already excludes them for.
  const { data, error } = await supabase
    .from("pokemon_instances")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("is_starter", false)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!data) {
    // Disambiguate why the atomic delete above matched nothing, same
    // "differentiate reasons after a failed atomic update" pattern
    // POST /api/inventory/lootboxes/[id]/open already uses.
    const { data: existing } = await supabase
      .from("pokemon_instances")
      .select("is_starter")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing?.is_starter) return NextResponse.json({ error: "Starters can't be discarded" }, { status: 400 });
    return NextResponse.json({ error: "Pokemon not found" }, { status: 404 });
  }

  // Best-effort: the discard itself already succeeded above, so a failure
  // to bump the counter shouldn't turn into a 500 for an action that
  // actually completed (upgrades/13-dashboard-stats.md).
  await supabase.rpc("increment_released_count", { p_user_id: user.id });

  return NextResponse.json({ ok: true });
}
