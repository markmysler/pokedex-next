import Link from "next/link";
import { lang } from "next/root-params";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getMatchHistoryForUser } from "@/lib/history";
import { getDictionary } from "@/lib/i18n/getDictionary";
import SectionTabs from "@/components/nav/SectionTabs";
import Sprite from "@/components/Sprite";
import Icon from "@/components/ui/Icon";

// Battle history (redesign wave v9): one row per match with the result as
// a chip, the opponent, the mode and your team as sprites.
export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const currentLang = await lang();
  const dict = await getDictionary();
  const t = dict.social.history;
  const supabase = getSupabaseServerClient();
  const matches = await getMatchHistoryForUser(supabase, user.id);
  const dateFormat = new Intl.DateTimeFormat(currentLang, { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">{dict.shell.groups.records}</span>
          <h1>{t.heading}</h1>
        </div>
      </div>
      <SectionTabs section="records" />

      {matches.length === 0 ? (
        <div className="panel">
          <div className="empty">
            <Icon name="clock" size={32} />
            <h3>{t.noMatches}</h3>
            <p>{t.noMatchesBody}</p>
            <Link href={`/${currentLang}/battle`} className="btn-primary">{t.battleCta}</Link>
          </div>
        </div>
      ) : (
        <div className="panel panel-flush table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t.colResult}</th>
                <th>{t.colOpponent}</th>
                <th className="hide-phone">{t.colMode}</th>
                <th>{t.colTeam}</th>
                <th className="num">{t.colDate}</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => {
                const opponent = m.opponentKind === "bot" ? t.opponentBot : (m.opponentName ?? t.opponentDeparted);
                return (
                  <tr key={m.id}>
                    <td><span className={`tag ${m.won ? "tag-good" : "tag-bad"}`}>{m.won ? t.won : t.lost}</span></td>
                    <td className="strong">{t.vs} {opponent}</td>
                    <td className="muted hide-phone">
                      {m.mode === "online" ? t.onlineMode : t.botMode}
                      {m.mode === "online" && m.roomCode && <span className="mono faint small"> · {t.roomLabel(m.roomCode)}</span>}
                    </td>
                    <td>
                      <span className="team-mini" title={m.teamSnapshot?.map((p) => p.name).join(", ")}>
                        {(m.teamSnapshot ?? []).map((p, i) => (
                          <Sprite key={`${p.number}-${i}`} name={p.name} form="normal" className="team-mini-sprite" />
                        ))}
                      </span>
                    </td>
                    <td className="num mono small muted date-cell">{dateFormat.format(new Date(m.playedAt))}</td>
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
