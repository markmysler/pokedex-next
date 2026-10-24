import Link from "next/link";
import { lang } from "next/root-params";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getInventoryForUser } from "@/lib/inventory";
import { getDashboardStats } from "@/lib/dashboardStats";
import { getMatchHistoryForUser } from "@/lib/history";
import { getFriendsForUser } from "@/lib/friends";
import { getDictionary } from "@/lib/i18n/getDictionary";
import Sprite from "@/components/Sprite";
import Icon from "@/components/ui/Icon";
import CaseArt from "@/components/cases/CaseArt";
import { isShinyInstance } from "@/lib/shiny";

const RECENT_MATCHES_LIMIT = 4;
const FRIENDS_LIMIT = 3;

function pct(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(0)}%`;
}

function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

// Home (redesign wave v9): the two things you come back to do, opening
// cases and battling, as the first thing on screen; numbers and recent
// activity underneath. Same queries as the old dashboard plus the friends
// list.
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const currentLang = await lang();
  const dict = await getDictionary();
  const t = dict.account.dashboard;
  const supabase = getSupabaseServerClient();

  const [{ pokemon, lootboxes }, matchHistory, stats, friends, { data: profile }] = await Promise.all([
    getInventoryForUser(supabase, user.id),
    getMatchHistoryForUser(supabase, user.id),
    getDashboardStats(supabase, user.id),
    getFriendsForUser(supabase, user.id),
    supabase.from("profiles").select("display_name").eq("user_id", user.id).single(),
  ]);

  const name = profile?.display_name ?? dict.account.profile.trainerFallback;
  const topPokemon = [...pokemon].sort((a, b) => b.total - a.total).slice(0, 3);
  const recentMatches = matchHistory.slice(0, RECENT_MATCHES_LIMIT);
  const href = (path: string) => `/${currentLang}${path}`;
  const dateFormat = new Intl.DateTimeFormat(currentLang, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">{t.heading}</span>
          <h1>{t.welcome(name)}</h1>
        </div>
      </div>

      <div className="home-hero">
        <section className="action-tile action-tile-cases">
          <div className="tile-art">
            <CaseArt className="case-art" />
          </div>
          <div className="stack" style={{ gap: 4 }}>
            <span className="eyebrow" style={{ color: lootboxes.length > 0 ? "var(--r-shiny)" : undefined }}>
              {lootboxes.length > 0 ? t.casesEyebrow(lootboxes.length) : t.noCasesEyebrow}
            </span>
            <h2>{lootboxes.length > 0 ? t.casesTitle : t.noCasesTitle}</h2>
            <p className="muted small">{lootboxes.length > 0 ? t.casesBody : t.noCasesBody}</p>
          </div>
          <div className="row">
            {lootboxes.length > 0 ? (
              <Link href={href("/open")} className="btn-primary">
                <Icon name="case" size={16} /> {t.openCases}
              </Link>
            ) : (
              <Link href={href("/battle")} className="btn-secondary">
                <Icon name="swords" size={16} /> {t.battleABot}
              </Link>
            )}
          </div>
        </section>

        <section className="action-tile action-tile-fight">
          <div className="tile-art">
            {topPokemon.map((p) => (
              <Sprite key={p.id} name={p.name} form={isShinyInstance(p) ? "shiny" : "normal"} className="tile-sprite" />
            ))}
          </div>
          <div className="stack" style={{ gap: 4 }}>
            <span className="eyebrow" style={{ color: "var(--accent)" }}>{t.fightEyebrow}</span>
            <h2>{t.fightTitle}</h2>
            <p className="muted small">{t.fightBody}</p>
          </div>
          <div className="row">
            <Link href={href("/battle?team=best")} className="btn-primary">
              <Icon name="swords" size={16} /> {t.fight}
            </Link>
            <Link href={href("/battle")} className="btn-ghost">{t.changeTeam}</Link>
          </div>
        </section>
      </div>

      <div className="stat-strip">
        <div>
          <b>{stats.botWins}</b>
          <span>{t.statBotWins}{stats.botWinPct !== null && ` · ${t.botWinRate(pct(stats.botWinPct))}`}</span>
        </div>
        <div>
          <b>{stats.onlineWins}</b>
          <span>{t.statOnlineWins}</span>
        </div>
        <div>
          <b>{stats.lootboxesOpened}</b>
          <span>{t.statCasesOpened}</span>
        </div>
        <div>
          <b>{stats.pokedexOwnedPct.toFixed(0)}%</b>
          <span>{t.statDexOwned}</span>
        </div>
      </div>

      <div className="home-grid">
        <section className="panel panel-flush">
          <div className="panel-head">
            <h2>{t.recentMatches}</h2>
            <Link href={href("/history")} className="link">{t.fullHistory}</Link>
          </div>
          {recentMatches.length === 0 ? (
            <div className="empty">
              <p>{t.noMatches}</p>
              <Link href={href("/battle")} className="btn-secondary btn-sm">{t.battleABot}</Link>
            </div>
          ) : (
            <ul className="rows">
              {recentMatches.map((m) => {
                const opponent = m.opponentKind === "bot" ? dict.social.history.opponentBot : (m.opponentName ?? dict.social.history.opponentDeparted);
                return (
                  <li key={m.id} className="list-row">
                    <span className={`tag ${m.won ? "tag-good" : "tag-bad"}`}>{m.won ? t.won : t.lost}</span>
                    <span className="list-row-main">{t.vs} {opponent}</span>
                    <span className="mono small faint">{dateFormat.format(new Date(m.playedAt))}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="panel panel-flush">
          <div className="panel-head">
            <h2>{t.friendsTitle}</h2>
            <Link href={href("/friends")} className="link">{t.allFriends}</Link>
          </div>
          {friends.incoming.length > 0 && (
            <Link href={href("/friends")} className="list-row list-row-link">
              <span className="tag tag-accent">{friends.incoming.length}</span>
              <span className="list-row-main">{t.requestsWaiting(friends.incoming.length)}</span>
              <Icon name="chevronRight" size={16} />
            </Link>
          )}
          {friends.friends.length === 0 ? (
            <div className="empty">
              <p>{t.noFriends}</p>
              <Link href={href("/friends")} className="btn-secondary btn-sm">{t.addFriends}</Link>
            </div>
          ) : (
            <ul className="rows">
              {friends.friends.slice(0, FRIENDS_LIMIT).map((f) => (
                <li key={f.friendshipId} className="list-row">
                  <span className="avatar avatar-sm">{initials(f.displayName)}</span>
                  <span className="list-row-main">{f.displayName}</span>
                  <Link href={href(`/friends/${f.friendshipId}`)} className="btn-ghost btn-sm">{t.chatFriend}</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
