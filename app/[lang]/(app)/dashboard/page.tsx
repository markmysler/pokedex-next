import Link from "next/link";
import { lang } from "next/root-params";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getInventoryForUser } from "@/lib/inventory";
import { getDashboardStats } from "@/lib/dashboardStats";
import { getMatchHistoryForUser } from "@/lib/history";
import { getDictionary } from "@/lib/i18n/getDictionary";
import Sprite from "@/components/Sprite";
import TypeBadges from "@/components/TypeBadges";
import CardTab from "@/components/ui/CardTab";
import { isShinyInstance } from "@/lib/shiny";
import { displayName } from "@/lib/pokemonDisplay";

const RECENT_MATCHES_LIMIT = 5;

function pct(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(0)}%`;
}

// No persisted "active team" concept (see upgrades/04-app-shell-navigation.md)
// — this shows the account's 3 highest-total owned Pokemon as a
// representative snapshot rather than a stored selection.
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const currentLang = await lang();
  const dict = await getDictionary();
  const t = dict.account.dashboard;
  const supabase = getSupabaseServerClient();

  const [{ pokemon }, matchHistory, stats] = await Promise.all([
    getInventoryForUser(supabase, user.id),
    // Reuses the same opponent-name resolution /history already uses
    // (upgrades/18-match-history-opponent-names.md) — the "Recent
    // Matches" card used to run its own inline query here and hardcode
    // "another player" for every online match, never resolving a name.
    getMatchHistoryForUser(supabase, user.id),
    getDashboardStats(supabase, user.id),
  ]);

  const topPokemon = [...pokemon].sort((a, b) => b.total - a.total).slice(0, 3);
  const recentMatches = matchHistory.slice(0, RECENT_MATCHES_LIMIT);

  return (
    <div className="page">
      <h1 className="page-title">{t.heading}</h1>

      {/* The 4 numbers a trainer actually checks at a glance, promoted out
          of the Battle Stats/Collection Stats cards below (upgrades/33-
          account-cluster-redesign.md) — same `stats` object, just a
          different layout, not a new query. */}
      <div className="stat-strip">
        <div className="stat-tile"><div className="stat-tile-n">{stats.botWins}</div><div className="stat-tile-l">{t.statBotWins}</div></div>
        <div className="stat-tile"><div className="stat-tile-n">{pct(stats.botWinPct)}</div><div className="stat-tile-l">{t.statBotWinRate}</div></div>
        <div className="stat-tile"><div className="stat-tile-n">{stats.onlineWins}</div><div className="stat-tile-l">{t.statOnlineWins}</div></div>
        <div className="stat-tile"><div className="stat-tile-n">{stats.pokedexOwnedPct.toFixed(1)}%</div><div className="stat-tile-l">{t.statDexOwned}</div></div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <CardTab icon="⭐" label={t.yourTeam} />
          {topPokemon.length === 0 ? (
            <p>{t.noPokemon}</p>
          ) : (
            <div className="dashboard-team">
              {topPokemon.map((p) => {
                const shiny = isShinyInstance(p);
                return (
                  <div key={p.id} className="dashboard-team-member">
                    <Sprite name={p.name} form={shiny ? "shiny" : "normal"} className="battle-sprite" />
                    <div>{displayName(p)}</div>
                    {p.nickname && <div className="detail-species-line">#{p.number} {p.name}</div>}
                    <TypeBadges type1={p.type1} type2={p.type2} center small />
                    {shiny && <span className="shiny-badge">✨ Shiny</span>}
                    <div className="total-stats">Total {p.total}</div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="dashboard-note">
            {t.strongestNote(topPokemon.length, pokemon.length)}{" "}
            <Link href={`/${currentLang}/inventory`}>{t.viewInventory}</Link>
          </p>
        </div>

        <div className="card">
          <CardTab icon="⚔️" label={t.battleStats} />
          <div className="dashboard-stats-grid">
            <div><strong>{stats.botLosses}</strong> {t.botLosses}</div>
            <div><strong>{stats.onlineLosses}</strong> {t.onlineLosses}</div>
            <div><strong>{pct(stats.onlineWinPct)}</strong> {t.onlineWinRate}</div>
          </div>
        </div>

        <div className="card">
          <CardTab icon="🎒" label={t.collectionStats} />
          <div className="dashboard-stats-grid">
            <div><strong>{stats.lootboxesOpened}</strong> {t.lootboxesOpened}</div>
            <div><strong>{stats.pokemonReleased}</strong> {t.pokemonReleased}</div>
            <div><strong>{stats.mostUsedPokemon ? `${stats.mostUsedPokemon.name} (${stats.mostUsedPokemon.count})` : "—"}</strong> {t.mostUsed}</div>
            <div><strong>{stats.mostOwnedPokemon ? `${stats.mostOwnedPokemon.name} (${stats.mostOwnedPokemon.count})` : "—"}</strong> {t.mostOwned}</div>
          </div>
        </div>

        <div className="card">
          <CardTab icon="🏆" label={t.recentMatches} color="var(--good)" />
          {recentMatches.length === 0 ? (
            <p>{t.noMatches} <Link href={`/${currentLang}/battle`}>{t.battleABot}</Link></p>
          ) : (
            <ul className="match-list">
              {recentMatches.map((m) => (
                <li key={m.id} className={`match-row${m.won ? " win" : " loss"}`}>
                  {m.won ? t.won : t.lost} {t.vs} {m.opponentLabel} —{" "}
                  {new Date(m.playedAt).toLocaleString()}
                </li>
              ))}
            </ul>
          )}
          <p className="dashboard-note"><Link href={`/${currentLang}/history`}>{t.fullHistory}</Link></p>
        </div>
      </div>
    </div>
  );
}
