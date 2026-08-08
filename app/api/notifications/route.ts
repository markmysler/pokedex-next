import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getNotificationsForUser } from "@/lib/notifications";

// Persisted, browsable history of the same six event kinds
// FriendNotifications.tsx already pushes as a live toast
// (upgrades/17-persistent-notifications.md). RLS also scopes
// `notifications` to auth.uid() = user_id, but this query is
// additionally scoped explicitly, same defense-in-depth posture as every
// other Route Handler here.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const notifications = await getNotificationsForUser(supabase, user.id);

  return NextResponse.json({ notifications });
}
