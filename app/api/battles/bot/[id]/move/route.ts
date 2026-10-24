import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { badRequest, readJson, serverError } from "@/lib/http";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { playBotRound, type BotBattleState } from "@/lib/botBattle";
import { teamSnapshot } from "@/lib/history";
import type { BattleAction } from "@/types/pokemon";
import type { Json } from "@/types/supabase";

const LOOTBOX_DROP_CHANCE = 0.6;

// Plays one action in a server-side bot battle. The server picks the bot's
// move, resolves the round with the shared engine, and decides the winner;
// the client only ever sends which move or switch the player chose.
export async function POST(request: Request, ctx: RouteContext<"/api/battles/bot/[id]/move">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await readJson(request);
  const action = body?.action as BattleAction | undefined;
  if (!action || (action.type !== "attack" && action.type !== "switch")) return badRequest("Invalid action");

  const supabase = getSupabaseServerClient();
  const { data: battle } = await supabase
    .from("bot_battles")
    .select("state, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!battle) return NextResponse.json({ error: "Battle not found" }, { status: 404 });
  if (battle.status !== "battling") return NextResponse.json({ error: "This battle is over" }, { status: 409 });

  const current = battle.state as unknown as BotBattleState;
  const outcome = playBotRound(current, action);
  if (!outcome.ok) return badRequest(outcome.error);
  const { state, turns } = outcome;

  if (!state.over) {
    // Only applies if nobody else resolved this turn first (a double click
    // or a retried request gets 409 instead of a second round).
    const { data: saved, error } = await supabase.rpc("save_bot_round", {
      p_id: id,
      p_user_id: user.id,
      p_expected_turn: current.turnCount,
      p_new_state: state as unknown as Json,
    });
    if (error) return serverError("save_bot_round", error);
    if (!saved) return NextResponse.json({ error: "That turn was already played" }, { status: 409 });
    return NextResponse.json({ state, turns, lootboxGranted: false, lootboxId: null });
  }

  const won = state.winner === 1;
  const { data, error } = await supabase.rpc("finish_bot_battle", {
    p_id: id,
    p_user_id: user.id,
    p_expected_turn: current.turnCount,
    p_new_state: state as unknown as Json,
    p_won: won,
    p_grant_lootbox: won && Math.random() < LOOTBOX_DROP_CHANCE,
    p_team: teamSnapshot(state.team1) as unknown as Json,
  });
  if (error) return serverError("finish_bot_battle", error);
  const result = data as { recorded: boolean; lootbox_id: string | null } | null;
  if (!result?.recorded) return NextResponse.json({ error: "That turn was already played" }, { status: 409 });

  return NextResponse.json({
    state,
    turns,
    lootboxGranted: Boolean(result.lootbox_id),
    lootboxId: result.lootbox_id,
  });
}
