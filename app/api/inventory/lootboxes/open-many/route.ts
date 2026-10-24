import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { badRequest, readJson, serverError } from "@/lib/http";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { instanceRowToOwned, rollLootboxInstance } from "@/lib/inventory";

// The most boxes one request opens. The inventory UI already trusts the
// returned count rather than the requested one, so asking for more simply
// opens this many.
const MAX_BATCH = 100;

// Opens up to `count` unopened lootboxes at once (upgrades/15-lootbox-batch-opening.md).
// open_lootboxes() claims whatever's actually available (FOR UPDATE SKIP
// LOCKED, so two concurrent batch-opens -- e.g. two tabs -- can't
// double-claim the same row) and inserts a Pokemon for each claimed box in
// the same transaction. If fewer than `count` were available, it opens
// however many it could and reports those, rather than erroring.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await readJson(request);
  const count: unknown = body?.count;
  if (typeof count !== "number" || !Number.isInteger(count) || count < 1) {
    return badRequest("count must be a positive integer");
  }

  const supabase = getSupabaseServerClient();

  // Roll only as many Pokemon as could actually be opened.
  const { count: unopened, error: countError } = await supabase
    .from("lootboxes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("opened_at", null);
  if (countError) return serverError("count lootboxes", countError);
  const toOpen = Math.min(count, unopened ?? 0, MAX_BATCH);
  if (toOpen === 0) return NextResponse.json({ pokemon: [] });

  const { data: rows, error } = await supabase.rpc("open_lootboxes", {
    p_user_id: user.id,
    p_instances: Array.from({ length: toOpen }, () => rollLootboxInstance()),
  });
  if (error) return serverError("open_lootboxes", error);

  return NextResponse.json({ pokemon: (rows ?? []).map(instanceRowToOwned) });
}
