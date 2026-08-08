import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { markAllNotificationsRead } from "@/lib/notifications";

// Called once when the Notifications page loads (upgrades/17-persistent-notifications.md)
// -- one bulk update, not a per-item "mark read" control. Opening the page
// is itself "you've now seen these."
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();
  await markAllNotificationsRead(supabase, user.id);

  return NextResponse.json({ ok: true });
}
