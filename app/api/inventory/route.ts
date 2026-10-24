import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { serverError } from "@/lib/http";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getInventoryForUser } from "@/lib/inventory";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();

  try {
    const { pokemon, lootboxes } = await getInventoryForUser(supabase, user.id);
    return NextResponse.json({ pokemon, lootboxes });
  } catch (err) {
    return serverError("inventory", err);
  }
}
