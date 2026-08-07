import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

const LOOTBOX_DROP_CHANCE = 0.25;

// Called once after every local (vs bot) battle ends — the client only ever
// reports whether it won, never whether a lootbox should drop. The 25%
// chance is rolled here, server-side, so it can't be forced from the client.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  if (typeof body.won !== "boolean") return NextResponse.json({ error: "won must be a boolean" }, { status: 400 });

  const supabase = getSupabaseServerClient();

  let lootboxGranted = false;
  if (body.won && Math.random() < LOOTBOX_DROP_CHANCE) {
    const { error: lootboxError } = await supabase.from("lootboxes").insert({ user_id: user.id });
    if (lootboxError) return NextResponse.json({ error: lootboxError.message }, { status: 500 });
    lootboxGranted = true;
  }

  const { error: matchError } = await supabase.from("match_results").insert({
    user_id: user.id,
    opponent: "bot",
    mode: "bot",
    won: body.won,
  });
  if (matchError) return NextResponse.json({ error: matchError.message }, { status: 500 });

  return NextResponse.json({ ok: true, lootboxGranted });
}
