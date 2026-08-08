import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  wins: number;
}

// Aggregate win counts per account, joined to profiles.display_name -- never
// email/auth.users (see profiles' table comment in
// supabase/migrations/20260807010000_auth.sql). match_results RLS only lets
// an authenticated client read its own rows, so this cross-user aggregation
// only ever runs server-side with the secret key (see GET /api/leaderboard).
// Small enough scale that grouping in application code is fine — no need
// for a SQL GROUP BY or materialized view.
export async function getLeaderboard(supabase: SupabaseClient<Database>): Promise<LeaderboardEntry[]> {
  const [{ data: profiles, error: profilesError }, { data: wins, error: winsError }] = await Promise.all([
    supabase.from("profiles").select("user_id, display_name"),
    supabase.from("match_results").select("user_id").eq("won", true).eq("mode", "online"),
  ]);
  if (profilesError) throw new Error(profilesError.message);
  if (winsError) throw new Error(winsError.message);

  const winCounts = new Map<string, number>();
  for (const row of wins ?? []) winCounts.set(row.user_id, (winCounts.get(row.user_id) ?? 0) + 1);

  return (profiles ?? [])
    .map((p) => ({ userId: p.user_id, displayName: p.display_name, wins: winCounts.get(p.user_id) ?? 0 }))
    .sort((a, b) => b.wins - a.wins || a.displayName.localeCompare(b.displayName));
}
