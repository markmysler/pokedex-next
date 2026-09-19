import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getLeaderboard } from "@/lib/leaderboard";
import { getDictionary } from "@/lib/i18n/getDictionary";

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function LeaderboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const dict = await getDictionary();
  const t = dict.social.leaderboard;
  const supabase = getSupabaseServerClient();
  const leaderboard = await getLeaderboard(supabase);

  return (
    <div className="page">
      <h1 className="page-title">{t.heading}</h1>
      <div className="card">
        {leaderboard.length === 0 ? (
          <p>{t.noTrainers}</p>
        ) : (
          <ol className="leaderboard-list">
            {leaderboard.map((entry, i) => (
              <li key={entry.userId} className={`leaderboard-row${entry.userId === user.id ? " me" : ""}`}>
                <span className="leaderboard-rank">{MEDALS[i] ?? `#${i + 1}`}</span>
                <span className="leaderboard-name">{entry.displayName}{entry.userId === user.id ? t.youSuffix : ""}</span>
                <span className="leaderboard-wins">{t.wins(entry.wins)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
