import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { rollAndPersistLootboxPokemon } from "@/lib/inventory";

// Opens up to `count` unopened lootboxes at once (upgrades/15-lootbox-batch-opening.md).
// claim_lootboxes() atomically claims whatever's actually available (FOR
// UPDATE SKIP LOCKED, so two concurrent batch-opens -- e.g. two tabs --
// can't double-claim the same row); if fewer than `count` were available,
// this simply rolls a Pokemon for however many were actually claimed and
// reports that number back, rather than erroring.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const count: unknown = body.count;
  if (typeof count !== "number" || !Number.isInteger(count) || count < 1) {
    return NextResponse.json({ error: "count must be a positive integer" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const { data: claimed, error: claimError } = await supabase.rpc("claim_lootboxes", {
    p_user_id: user.id,
    p_count: count,
  });
  if (claimError) return NextResponse.json({ error: claimError.message }, { status: 500 });

  // RETURNING row order isn't guaranteed by Postgres -- sort explicitly so
  // "in the order they were claimed" (oldest lootbox first, matching the
  // function's own `order by created_at asc`) holds regardless.
  const orderedClaims = [...claimed].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  try {
    const pokemon = [];
    for (let i = 0; i < orderedClaims.length; i++) {
      pokemon.push(await rollAndPersistLootboxPokemon(supabase, user.id));
    }
    return NextResponse.json({ pokemon });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to open lootboxes" }, { status: 500 });
  }
}
