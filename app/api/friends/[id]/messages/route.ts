import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getFriendshipForUser } from "@/lib/friends";
import { broadcastToFriendship, broadcastToUser } from "@/lib/supabase/broadcast";
import { createNotification } from "@/lib/notifications";

const MAX_MESSAGE_LENGTH = 300;
const HISTORY_LIMIT = 200;

// Persistent friend DMs (unlike battle chat, which is deliberately
// ephemeral) — two friends are very unlikely to both be online at once, so
// messages have to survive until whoever's offline logs back in
// (upgrades/12-friend-chat-trading.md).
export async function GET(_request: Request, ctx: RouteContext<"/api/friends/[id]/messages">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();

  const friendship = await getFriendshipForUser(supabase, id, user.id);
  if (!friendship) return NextResponse.json({ error: "Friendship not found" }, { status: 404 });
  if (friendship.status !== "accepted") {
    return NextResponse.json({ error: "You can only message accepted friends" }, { status: 403 });
  }

  const { data: rows, error } = await supabase
    .from("friend_messages")
    .select("*")
    .eq("friendship_id", id)
    .order("created_at", { ascending: true })
    .limit(HISTORY_LIMIT);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .in("user_id", [user.id, friendship.otherUserId]);
  const nameById = new Map((profiles ?? []).map((p) => [p.user_id, p.display_name]));

  const messages = (rows ?? []).map((r) => ({
    text: r.text,
    senderDisplayName: nameById.get(r.sender_id) ?? "a departed player",
    mine: r.sender_id === user.id,
    createdAt: r.created_at,
  }));

  return NextResponse.json({ messages });
}

export async function POST(request: Request, ctx: RouteContext<"/api/friends/[id]/messages">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return NextResponse.json({ error: "Message can't be empty" }, { status: 400 });
  if (text.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer` }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const friendship = await getFriendshipForUser(supabase, id, user.id);
  if (!friendship) return NextResponse.json({ error: "Friendship not found" }, { status: 404 });
  if (friendship.status !== "accepted") {
    return NextResponse.json({ error: "You can only message accepted friends" }, { status: 403 });
  }

  const { error: insertError } = await supabase.from("friend_messages").insert({
    friendship_id: id,
    sender_id: user.id,
    text,
  });
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  const { data: myProfile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).single();
  const senderDisplayName = myProfile?.display_name ?? "Someone";

  // Instant delivery to a friend who currently has this chat open...
  await broadcastToFriendship(id, "friend-message", { text, senderDisplayName, senderId: user.id });
  // ...plus a toast/badge even if they're elsewhere in the app, same
  // account-level channel step 5's friend requests/battle invites already use.
  const notifyPayload = { friendshipId: id, senderDisplayName, text };
  await broadcastToUser(friendship.otherUserId, "friend-message", notifyPayload);
  await createNotification(supabase, friendship.otherUserId, "friend-message", notifyPayload);

  return NextResponse.json({ ok: true });
}
