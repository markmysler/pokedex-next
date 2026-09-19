import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getMatchHistoryForUser } from "@/lib/history";
import { getDictionary } from "@/lib/i18n/getDictionary";

export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const dict = await getDictionary();
  const t = dict.social.history;
  const supabase = getSupabaseServerClient();
  const matches = await getMatchHistoryForUser(supabase, user.id);

  return (
    <div className="page">
      <h1 className="page-title">{t.heading}</h1>
      <div className="card">
        {matches.length === 0 ? (
          <p>{t.noMatches}</p>
        ) : (
          <ul className="match-list">
            {matches.map((m) => {
              const opponentLabel = m.opponentKind === "bot" ? t.opponentBot : (m.opponentName ?? t.opponentDeparted);
              return (
                <li key={m.id} className={`match-row match-row-detailed${m.won ? " win" : " loss"}`}>
                  <span className="match-row-icon">{m.won ? "🏆" : "💀"}</span>
                  <div className="match-row-body">
                    <div className="match-row-main">
                      <span>{m.won ? t.won : t.lost} {t.vs} {opponentLabel}</span>
                      <span className="match-row-date">{new Date(m.playedAt).toLocaleString()}</span>
                    </div>
                    <div className="match-row-sub">
                      {m.mode === "online" ? `${t.onlineMode}${m.roomCode ? t.roomSuffix(m.roomCode) : ""}` : t.botMode}
                      {m.teamSnapshot && m.teamSnapshot.length > 0 && t.yourTeamSuffix(m.teamSnapshot.map((p) => p.name).join(", "))}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
