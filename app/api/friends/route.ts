import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { serverError } from "@/lib/http";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getFriendsForUser } from "@/lib/friends";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();
  try {
    const data = await getFriendsForUser(supabase, user.id);
    return NextResponse.json(data);
  } catch (err) {
    return serverError("friends", err);
  }
}
