import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

// Deliberately placeholder-grade (see upgrades/04-app-shell-navigation.md) —
// full per-match detail and a public leaderboard are step 7.
export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("match_results")
    .select("*")
    .eq("user_id", user.id)
    .order("played_at", { ascending: false });

  const matches = data ?? [];

  return (
    <div className="page">
      <h1 className="page-title">📜 Battle History</h1>
      <div className="card">
        {matches.length === 0 ? (
          <p>No matches played yet.</p>
        ) : (
          <ul className="match-list">
            {matches.map((m) => (
              <li key={m.id} className={`match-row${m.won ? " win" : " loss"}`}>
                {m.won ? "🏆 Won" : "💀 Lost"} — {m.mode === "bot" ? "vs Bot" : "vs Player"} —{" "}
                {new Date(m.played_at).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="dashboard-note">This is a simple log for now — full match detail and a public leaderboard are coming later.</p>
    </div>
  );
}
