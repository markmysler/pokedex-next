import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { serverError } from "@/lib/http";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getUserPokedexData } from "@/lib/userPokedexData";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();

  try {
    const result = await getUserPokedexData(supabase, user.id);
    return NextResponse.json(result);
  } catch (err) {
    return serverError("user-data", err);
  }
}
