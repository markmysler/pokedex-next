import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { badRequest, readJson, serverError } from "@/lib/http";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await readJson(request);
  if (!body) return badRequest();
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  if (displayName.length < 2 || displayName.length > 30) {
    return NextResponse.json({ error: "Display name must be 2-30 characters" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("user_id", user.id)
    .select("display_name")
    .single();

  if (error) return serverError("profile", error);
  return NextResponse.json(data);
}
