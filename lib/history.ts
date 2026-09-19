import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export interface MatchHistoryEntry {
  id: string;
  mode: "bot" | "online";
  won: boolean;
  // Split into a kind + a resolved name instead of a single pre-rendered
  // "a Bot"/"a departed player" label (upgrades/57-i18n-social-cluster.md)
  // -- baking English text into this data-layer module would've meant
  // every caller (Dashboard, History) inherited an untranslatable string
  // regardless of locale. Callers render the localized label themselves.
  opponentKind: "bot" | "player";
  opponentName: string | null;
  roomCode: string | null;
  teamSnapshot: { number: string; name: string }[] | null;
  playedAt: string;
}

// Shared by GET /api/history and the /history Server Component. Resolves
// each online match's opponent id (stored as raw text on match_results,
// see app/api/rooms/[code]/move/route.ts) to a display name in one extra
// query, rather than exposing the id itself.
export async function getMatchHistoryForUser(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<MatchHistoryEntry[]> {
  const { data, error } = await supabase
    .from("match_results")
    .select("*")
    .eq("user_id", userId)
    .order("played_at", { ascending: false });
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const opponentIds = Array.from(new Set(rows.filter((r) => r.mode === "online").map((r) => r.opponent)));

  const nameById = new Map<string, string>();
  if (opponentIds.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", opponentIds);
    for (const p of profiles ?? []) nameById.set(p.user_id, p.display_name);
  }

  return rows.map((r) => ({
    id: r.id,
    mode: r.mode,
    won: r.won,
    opponentKind: r.mode === "bot" ? "bot" : "player",
    opponentName: r.mode === "bot" ? null : (nameById.get(r.opponent) ?? null),
    roomCode: r.room_code,
    teamSnapshot: (r.team_snapshot as { number: string; name: string }[] | null) ?? null,
    playedAt: r.played_at,
  }));
}
