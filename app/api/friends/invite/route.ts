import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { broadcastToUser } from "@/lib/supabase/broadcast";
import { createNotification } from "@/lib/notifications";

// A UI shortcut over the existing room-code flow (original plan's step 5) —
// not a parallel matchmaking system. The room itself was already created via
// the normal POST /api/rooms before this is called; this just verifies the
// friendship and delivers a live invite to the target's toast.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const friendUserId = typeof body.friendUserId === "string" ? body.friendUserId : "";
  const roomCode = typeof body.roomCode === "string" ? body.roomCode.toUpperCase() : "";
  if (!friendUserId || !roomCode) {
    return NextResponse.json({ error: "friendUserId and roomCode are required" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const { data: friendship, error: friendshipError } = await supabase
    .from("friendships")
    .select("*")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${friendUserId}),and(requester_id.eq.${friendUserId},addressee_id.eq.${user.id})`
    )
    .eq("status", "accepted")
    .maybeSingle();
  if (friendshipError) return NextResponse.json({ error: friendshipError.message }, { status: 500 });
  if (!friendship) return NextResponse.json({ error: "You can only invite accepted friends" }, { status: 403 });

  const { data: myProfile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).single();

  const payload = { fromDisplayName: myProfile?.display_name ?? "Someone", roomCode };
  await broadcastToUser(friendUserId, "battle-invite", payload);
  await createNotification(supabase, friendUserId, "battle-invite", payload);

  return NextResponse.json({ ok: true });
}
