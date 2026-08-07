import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

// The "discard" action — removes an owned Pokemon instance permanently.
export async function DELETE(_request: Request, ctx: RouteContext<"/api/inventory/pokemon/[id]">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();

  // Scoping the delete to user_id in the query itself (not a separate
  // fetch-then-check) means a mismatched owner just deletes zero rows
  // rather than needing a second round trip.
  const { data, error } = await supabase
    .from("pokemon_instances")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Pokemon not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
