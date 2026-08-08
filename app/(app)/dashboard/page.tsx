import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getInventoryForUser } from "@/lib/inventory";
import Sprite from "@/components/Sprite";
import TypeBadges from "@/components/TypeBadges";
import { isShinyInstance } from "@/lib/shiny";

// No persisted "active team" concept (see upgrades/04-app-shell-navigation.md)
// — this shows the account's 3 highest-total owned Pokemon as a
// representative snapshot rather than a stored selection.
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = getSupabaseServerClient();

  const [{ pokemon }, matchesRes, allMatchesRes] = await Promise.all([
    getInventoryForUser(supabase, user.id),
    supabase.from("match_results").select("*").eq("user_id", user.id).order("played_at", { ascending: false }).limit(5),
    supabase.from("match_results").select("mode, won").eq("user_id", user.id),
  ]);

  const topPokemon = [...pokemon].sort((a, b) => b.total - a.total).slice(0, 3);
  const recentMatches = matchesRes.data ?? [];
  const allMatches = allMatchesRes.data ?? [];

  const stats = {
    botWins: allMatches.filter((m) => m.mode === "bot" && m.won).length,
    botLosses: allMatches.filter((m) => m.mode === "bot" && !m.won).length,
    onlineWins: allMatches.filter((m) => m.mode === "online" && m.won).length,
    onlineLosses: allMatches.filter((m) => m.mode === "online" && !m.won).length,
  };

  return (
    <div className="page">
      <h1 className="page-title">🏠 Dashboard</h1>

      <div className="dashboard-grid">
        <div className="card">
          <h2>Your Team</h2>
          {topPokemon.length === 0 ? (
            <p>You don&apos;t own any Pokémon yet.</p>
          ) : (
            <div className="dashboard-team">
              {topPokemon.map((p) => {
                const shiny = isShinyInstance(p);
                return (
                  <div key={p.id} className="dashboard-team-member">
                    <Sprite name={p.name} form={shiny ? "shiny" : "normal"} className="battle-sprite" />
                    <div>#{p.number} {p.name}</div>
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
          <h2>Battle Stats</h2>
          <div className="dashboard-stats-grid">
            <div><strong>{stats.botWins}</strong> bot wins</div>
            <div><strong>{stats.botLosses}</strong> bot losses</div>
            <div><strong>{stats.onlineWins}</strong> online wins</div>
            <div><strong>{stats.onlineLosses}</strong> online losses</div>
          </div>
        </div>

        <div className="card">
          <h2>Recent Matches</h2>
          {recentMatches.length === 0 ? (
            <p>No matches played yet. <Link href="/battle">Battle a bot →</Link></p>
          ) : (
            <ul className="match-list">
              {recentMatches.map((m) => (
                <li key={m.id} className={`match-row${m.won ? " win" : " loss"}`}>
                  {m.won ? "🏆 Won" : "💀 Lost"} vs {m.mode === "bot" ? "a bot" : "another player"} —{" "}
                  {new Date(m.played_at).toLocaleString()}
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
