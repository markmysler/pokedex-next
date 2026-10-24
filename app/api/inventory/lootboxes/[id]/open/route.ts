import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { serverError } from "@/lib/http";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { instanceRowToOwned, rollLootboxInstance } from "@/lib/inventory";

export async function POST(_request: Request, ctx: RouteContext<"/api/inventory/lootboxes/[id]/open">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();

  // One transaction (open_lootbox): claims the box only if it's still
  // unopened and the caller's, and inserts the rolled Pokemon with it. Two
  // concurrent opens of the same box can't both succeed, and a failed
  // insert can't leave the box spent.
  const { data: rows, error } = await supabase.rpc("open_lootbox", {
    p_lootbox_id: id,
    p_user_id: user.id,
    p_instance: rollLootboxInstance(),
  });
  if (error) return serverError("open_lootbox", error);

  if (!rows || rows.length === 0) {
    const { data: existing } = await supabase
      .from("lootboxes")
      .select("user_id, opened_at")
      .eq("id", id)
      .maybeSingle();
    if (!existing) return NextResponse.json({ error: "Lootbox not found" }, { status: 404 });
    if (existing.user_id !== user.id) return NextResponse.json({ error: "Not your lootbox" }, { status: 403 });
    return NextResponse.json({ error: "Lootbox already opened" }, { status: 409 });
  }

  return NextResponse.json({ pokemon: instanceRowToOwned(rows[0]) });
}
