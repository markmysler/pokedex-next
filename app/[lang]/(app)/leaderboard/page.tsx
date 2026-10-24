import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getLeaderboard } from "@/lib/leaderboard";
import { getDictionary } from "@/lib/i18n/getDictionary";
import SectionTabs from "@/components/nav/SectionTabs";
import Icon from "@/components/ui/Icon";

const MEDAL_CLASSES = ["gold", "silver", "bronze"];

function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

// Leaderboard (redesign wave v9): a ranked table by online wins, with
// medals for the top three and your own row highlighted.
export default async function LeaderboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const dict = await getDictionary();
  const t = dict.social.leaderboard;
  const supabase = getSupabaseServerClient();
  const leaderboard = await getLeaderboard(supabase);

  return (
    <div className="page page-narrow">
      <div className="page-head">
        <div>
          <span className="eyebrow">{t.subheading}</span>
          <h1>{t.heading}</h1>
        </div>
      </div>
      <SectionTabs section="records" />

      {leaderboard.length === 0 ? (
        <div className="panel">
          <div className="empty">
            <Icon name="trophy" size={32} />
            <p>{t.noTrainers}</p>
          </div>
        </div>
      ) : (
        <div className="panel panel-flush table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 72 }}>{t.colRank}</th>
                <th>{t.colTrainer}</th>
                <th className="num">{t.colWins}</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, i) => {
                const me = entry.userId === user.id;
                return (
                  <tr key={entry.userId} className={me ? "is-me" : undefined}>
                    <td>
                      {i < 3 ? (
                        <span className={`medal ${MEDAL_CLASSES[i]}`}><Icon name="medal" size={16} /> {i + 1}</span>
                      ) : (
                        <span className="mono muted">#{i + 1}</span>
                      )}
                    </td>
                    <td>
                      <span className="row" style={{ flexWrap: "nowrap" }}>
                        <span className="avatar avatar-sm">{initials(entry.displayName)}</span>
                        <span className="strong">{entry.displayName}{me ? t.youSuffix : ""}</span>
                      </span>
                    </td>
                    <td className="num mono strong">{entry.wins}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
