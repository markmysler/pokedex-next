import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { getPokemon, pokedexOrder } from "@/lib/pokedex";

export interface NamedCount {
  number: string;
  name: string;
  count: number;
}

export interface DashboardStats {
  botWins: number;
  botLosses: number;
  onlineWins: number;
  onlineLosses: number;
  botWinPct: number | null;
  onlineWinPct: number | null;
  lootboxesOpened: number;
  pokemonReleased: number;
  mostUsedPokemon: NamedCount | null;
  mostOwnedPokemon: NamedCount | null;
  pokedexOwnedPct: number;
}

function winPct(wins: number, losses: number): number | null {
  const played = wins + losses;
  return played === 0 ? null : (wins / played) * 100;
}

function topEntry(counts: Map<string, number>): NamedCount | null {
  let best: NamedCount | null = null;
  for (const [number, count] of counts) {
    if (!best || count > best.count) {
      const species = getPokemon(number);
      best = { number, name: species?.name ?? number, count };
    }
  }
  return best;
}

// Shared by app/(app)/dashboard/page.tsx — keeps the page thin instead of
// growing a wall of ad-hoc queries inline (same pattern as
// lib/leaderboard.ts / lib/history.ts).
export async function getDashboardStats(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<DashboardStats> {
  const [matchesRes, lootboxesRes, profileRes, instancesRes] = await Promise.all([
    supabase.from("match_results").select("mode, won, team_snapshot").eq("user_id", userId),
    supabase.from("lootboxes").select("id", { count: "exact", head: true }).eq("user_id", userId).not("opened_at", "is", null),
    supabase.from("profiles").select("pokemon_released_count").eq("user_id", userId).single(),
    supabase.from("pokemon_instances").select("pokemon_number").eq("user_id", userId),
  ]);
  if (matchesRes.error) throw new Error(matchesRes.error.message);
  if (lootboxesRes.error) throw new Error(lootboxesRes.error.message);
  if (profileRes.error) throw new Error(profileRes.error.message);
  if (instancesRes.error) throw new Error(instancesRes.error.message);

  const matches = matchesRes.data;
  const botWins = matches.filter((m) => m.mode === "bot" && m.won).length;
  const botLosses = matches.filter((m) => m.mode === "bot" && !m.won).length;
  const onlineWins = matches.filter((m) => m.mode === "online" && m.won).length;
  const onlineLosses = matches.filter((m) => m.mode === "online" && !m.won).length;

  const usedCounts = new Map<string, number>();
  for (const m of matches) {
    const snapshot = m.team_snapshot as { number: string; name: string }[] | null;
    if (!snapshot) continue;
    for (const p of snapshot) usedCounts.set(p.number, (usedCounts.get(p.number) ?? 0) + 1);
  }

  const ownedCounts = new Map<string, number>();
  for (const row of instancesRes.data) {
    ownedCounts.set(row.pokemon_number, (ownedCounts.get(row.pokemon_number) ?? 0) + 1);
  }

  return {
    botWins,
    botLosses,
    onlineWins,
    onlineLosses,
    botWinPct: winPct(botWins, botLosses),
    onlineWinPct: winPct(onlineWins, onlineLosses),
    lootboxesOpened: lootboxesRes.count ?? 0,
    pokemonReleased: profileRes.data.pokemon_released_count,
    mostUsedPokemon: topEntry(usedCounts),
    mostOwnedPokemon: topEntry(ownedCounts),
    pokedexOwnedPct: (ownedCounts.size / pokedexOrder.length) * 100,
  };
}
