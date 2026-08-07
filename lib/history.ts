import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export interface MatchHistoryEntry {
  id: string;
  mode: "bot" | "online";
  won: boolean;
  opponentLabel: string;
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
    opponentLabel: r.mode === "bot" ? "a Bot" : (nameById.get(r.opponent) ?? "a departed player"),
    roomCode: r.room_code,
    teamSnapshot: (r.team_snapshot as { number: string; name: string }[] | null) ?? null,
    playedAt: r.played_at,
  }));
}
