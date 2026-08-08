import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getMatchHistoryForUser } from "@/lib/history";

export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = getSupabaseServerClient();
  const matches = await getMatchHistoryForUser(supabase, user.id);

  return (
    <div className="page">
      <h1 className="page-title">📜 Battle History</h1>
      <div className="card">
        {matches.length === 0 ? (
          <p>No matches played yet.</p>
        ) : (
          <ul className="match-list">
            {matches.map((m) => (
              <li key={m.id} className={`match-row match-row-detailed${m.won ? " win" : " loss"}`}>
                <div className="match-row-main">
                  <span>{m.won ? "🏆 Won" : "💀 Lost"} vs {m.opponentLabel}</span>
                  <span className="match-row-date">{new Date(m.playedAt).toLocaleString()}</span>
                </div>
                <div className="match-row-sub">
                  {m.mode === "online" ? `Online${m.roomCode ? ` — room ${m.roomCode}` : ""}` : "vs Bot"}
                  {m.teamSnapshot && m.teamSnapshot.length > 0 && (
                    <> · Your team: {m.teamSnapshot.map((p) => p.name).join(", ")}</>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
