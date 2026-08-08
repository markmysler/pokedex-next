import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getLeaderboard } from "@/lib/leaderboard";

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function LeaderboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = getSupabaseServerClient();
  const leaderboard = await getLeaderboard(supabase);

  return (
    <div className="page">
      <h1 className="page-title">🏆 Leaderboard</h1>
      <div className="card">
        {leaderboard.length === 0 ? (
          <p>No trainers yet.</p>
        ) : (
          <ol className="leaderboard-list">
            {leaderboard.map((entry, i) => (
              <li key={entry.userId} className={`leaderboard-row${entry.userId === user.id ? " me" : ""}`}>
                <span className="leaderboard-rank">{MEDALS[i] ?? `#${i + 1}`}</span>
                <span className="leaderboard-name">{entry.displayName}{entry.userId === user.id ? " (you)" : ""}</span>
                <span className="leaderboard-wins">{entry.wins} online win{entry.wins === 1 ? "" : "s"}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
