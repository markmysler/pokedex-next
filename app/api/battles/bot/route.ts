import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { badRequest, readJson, serverError } from "@/lib/http";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getOwnedPokemonInstances } from "@/lib/inventory";
import { createBotBattleState } from "@/lib/botBattle";
import type { Json } from "@/types/supabase";

const TEAM_SIZE = 3;

// Starts a battle against the bot. Only the instance ids come from the
// client; the player's team is re-fetched from the database (stats and
// moves included) and the bot's team is rolled here, so the state the
// server resolves rounds from is never client-supplied.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await readJson(request);
  const ids = body?.pokemonInstanceIds;
  if (!Array.isArray(ids) || ids.length !== TEAM_SIZE || !ids.every((id) => typeof id === "string")) {
    return badRequest(`Pick exactly ${TEAM_SIZE} Pokemon`);
  }

  const supabase = getSupabaseServerClient();
  const team = await getOwnedPokemonInstances(supabase, user.id, ids as string[]);
  if (!team) return NextResponse.json({ error: "You don't own all of those Pokemon" }, { status: 403 });

  // Finished and abandoned battles have nothing left to read (the result is
  // in match_results), so they're dropped here rather than kept forever.
  const { error: cleanupError } = await supabase
    .from("bot_battles")
    .delete()
    .eq("user_id", user.id)
    .neq("status", "battling");
  if (cleanupError) return serverError("clean up bot battles", cleanupError);

  // A player has at most one live bot battle: starting a new one abandons
  // any unfinished one (no result, no reward, same as closing the tab).
  const { error: abandonError } = await supabase
    .from("bot_battles")
    .update({ status: "abandoned", updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("status", "battling");
  if (abandonError) return serverError("abandon bot battles", abandonError);

  const state = createBotBattleState(team);
  const { data, error } = await supabase
    .from("bot_battles")
    .insert({ user_id: user.id, state: state as unknown as Json })
    .select("id")
    .single();
  if (error || !data) return serverError("create bot battle", error);

  return NextResponse.json({ battleId: data.id, state });
}
