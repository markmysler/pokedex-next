import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { broadcastToUser } from "@/lib/supabase/broadcast";
import { createNotification } from "@/lib/notifications";

export async function POST(request: Request, ctx: RouteContext<"/api/friends/[id]/respond">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  if (typeof body.accept !== "boolean") return NextResponse.json({ error: "accept must be a boolean" }, { status: 400 });

  const supabase = getSupabaseServerClient();

  const { data: row, error: fetchError } = await supabase.from("friendships").select("*").eq("id", id).maybeSingle();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Friend request not found" }, { status: 404 });
  if (row.addressee_id !== user.id) return NextResponse.json({ error: "Not your request to respond to" }, { status: 403 });
  if (row.status !== "pending") return NextResponse.json({ error: "This request was already resolved" }, { status: 409 });

  if (body.accept) {
    const { error: updateError } = await supabase
      .from("friendships")
      .update({ status: "accepted", responded_at: new Date().toISOString() })
      .eq("id", id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    const { data: myProfile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).single();
    const payload = { fromDisplayName: myProfile?.display_name ?? "Someone" };
    await broadcastToUser(row.requester_id, "friend-request-accepted", payload);
    await createNotification(supabase, row.requester_id, "friend-request-accepted", payload);

    return NextResponse.json({ ok: true, status: "accepted" });
  }

  const { error: deleteError } = await supabase.from("friendships").delete().eq("id", id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  return NextResponse.json({ ok: true, status: "declined" });
}
