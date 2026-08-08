import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { broadcastToUser } from "@/lib/supabase/broadcast";
import { createNotification } from "@/lib/notifications";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const friendCode = typeof body.friendCode === "string" ? body.friendCode.trim().toUpperCase() : "";
  if (!friendCode) return NextResponse.json({ error: "Enter a friend code" }, { status: 400 });

  const supabase = getSupabaseServerClient();

  const { data: target, error: targetError } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .eq("friend_code", friendCode)
    .maybeSingle();
  if (targetError) return NextResponse.json({ error: targetError.message }, { status: 500 });
  if (!target) return NextResponse.json({ error: "No account found with that friend code" }, { status: 404 });
  if (target.user_id === user.id) return NextResponse.json({ error: "You can't friend yourself" }, { status: 400 });

  // Look for an existing row in either direction — no DB-level uniqueness
  // constraint on the pair (matches this codebase's app-level-check
  // preference, e.g. battle_rooms.status), so this check is the guard.
  const { data: existingRows, error: existingError } = await supabase
    .from("friendships")
    .select("*")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${target.user_id}),and(requester_id.eq.${target.user_id},addressee_id.eq.${user.id})`
    );
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

  const existing = (existingRows ?? [])[0];
  const { data: myProfile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).single();

  if (existing) {
    if (existing.status === "accepted") {
      return NextResponse.json({ error: "You're already friends" }, { status: 409 });
    }
    if (existing.requester_id === user.id) {
      return NextResponse.json({ error: "A friend request is already pending" }, { status: 409 });
    }

    // A pending request from them to us already exists — accept it instead
    // of creating a second, dangling row (upgrades/05-friend-system.md).
    const { error: acceptError } = await supabase
      .from("friendships")
      .update({ status: "accepted", responded_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (acceptError) return NextResponse.json({ error: acceptError.message }, { status: 500 });

    const acceptedPayload = { fromDisplayName: myProfile?.display_name ?? "Someone" };
    await broadcastToUser(target.user_id, "friend-request-accepted", acceptedPayload);
    await createNotification(supabase, target.user_id, "friend-request-accepted", acceptedPayload);
    return NextResponse.json({ ok: true, status: "accepted" });
  }

  const { error: insertError } = await supabase.from("friendships").insert({
    requester_id: user.id,
    addressee_id: target.user_id,
  });
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  const requestPayload = { fromDisplayName: myProfile?.display_name ?? "Someone" };
  await broadcastToUser(target.user_id, "friend-request", requestPayload);
  await createNotification(supabase, target.user_id, "friend-request", requestPayload);
  return NextResponse.json({ ok: true, status: "pending" });
}
