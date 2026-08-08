import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

// Unfriend (an accepted row) or cancel (a pending outgoing row) — either
// party on the friendship may delete it.
export async function DELETE(_request: Request, ctx: RouteContext<"/api/friends/[id]">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();

  const { data: row, error: fetchError } = await supabase.from("friendships").select("*").eq("id", id).maybeSingle();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Friendship not found" }, { status: 404 });
  if (row.requester_id !== user.id && row.addressee_id !== user.id) {
    return NextResponse.json({ error: "Not part of this friendship" }, { status: 403 });
  }

  const { error: deleteError } = await supabase.from("friendships").delete().eq("id", id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
