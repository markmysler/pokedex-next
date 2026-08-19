import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getInventoryForUser } from "@/lib/inventory";
import { getDashboardStats } from "@/lib/dashboardStats";
import { getMatchHistoryForUser } from "@/lib/history";
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
      <h1 className="page-title">🏠 Dashboard</h1>

      {/* The 4 numbers a trainer actually checks at a glance, promoted out
          of the Battle Stats/Collection Stats cards below (upgrades/33-
          account-cluster-redesign.md) — same `stats` object, just a
          different layout, not a new query. */}
      <div className="stat-strip">
        <div className="stat-tile"><div className="stat-tile-n">{stats.botWins}</div><div className="stat-tile-l">Bot wins</div></div>
        <div className="stat-tile"><div className="stat-tile-n">{pct(stats.botWinPct)}</div><div className="stat-tile-l">Bot win rate</div></div>
        <div className="stat-tile"><div className="stat-tile-n">{stats.onlineWins}</div><div className="stat-tile-l">Online wins</div></div>
        <div className="stat-tile"><div className="stat-tile-n">{stats.pokedexOwnedPct.toFixed(1)}%</div><div className="stat-tile-l">Dex owned</div></div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <CardTab icon="⭐" label="Your team" />
          {topPokemon.length === 0 ? (
            <p>You don&apos;t own any Pokémon yet.</p>
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
            Showing your {topPokemon.length} strongest Pokémon by total stats · {pokemon.length} owned total.{" "}
            <Link href="/inventory">View inventory →</Link>
          </p>
        </div>

        <div className="card">
          <CardTab icon="⚔️" label="Battle stats" />
          <div className="dashboard-stats-grid">
            <div><strong>{stats.botLosses}</strong> bot losses</div>
            <div><strong>{stats.onlineLosses}</strong> online losses</div>
            <div><strong>{pct(stats.onlineWinPct)}</strong> online win rate</div>
          </div>
        </div>

        <div className="card">
          <CardTab icon="🎒" label="Collection stats" />
          <div className="dashboard-stats-grid">
            <div><strong>{stats.lootboxesOpened}</strong> lootboxes opened</div>
            <div><strong>{stats.pokemonReleased}</strong> Pokémon released</div>
            <div><strong>{stats.mostUsedPokemon ? `${stats.mostUsedPokemon.name} (${stats.mostUsedPokemon.count})` : "—"}</strong> most used</div>
            <div><strong>{stats.mostOwnedPokemon ? `${stats.mostOwnedPokemon.name} (${stats.mostOwnedPokemon.count})` : "—"}</strong> most owned</div>
          </div>
        </div>

        <div className="card">
          <CardTab icon="🏆" label="Recent matches" color="var(--good)" />
          {recentMatches.length === 0 ? (
            <p>No matches played yet. <Link href="/battle">Battle a bot →</Link></p>
          ) : (
            <ul className="match-list">
              {recentMatches.map((m) => (
                <li key={m.id} className={`match-row${m.won ? " win" : " loss"}`}>
                  {m.won ? "🏆 Won" : "💀 Lost"} vs {m.opponentLabel} —{" "}
                  {new Date(m.playedAt).toLocaleString()}
                </li>
              ))}
            </ul>
          )}
          <p className="dashboard-note"><Link href="/history">Full history →</Link></p>
        </div>
      </div>
    </div>
  );
}
