import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getInventoryForUser } from "@/lib/inventory";
import Sprite from "@/components/Sprite";
import TypeBadges from "@/components/TypeBadges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// No persisted "active team" concept (see upgrades/archive/04-app-shell-navigation.md)
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
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">🏠 Dashboard</h1>

      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Your Team</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {topPokemon.length === 0 ? (
              <p className="text-sm text-muted-foreground">You don&apos;t own any Pokémon yet.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {topPokemon.map((p) => (
                  <div key={p.id} className="flex w-24 flex-col items-center gap-1 text-center text-xs">
                    <Sprite name={p.name} form="normal" className="size-16 object-contain" />
                    <div>#{p.number} {p.name}</div>
                    <TypeBadges type1={p.type1} type2={p.type2} center small />
                    <div className="font-bold text-muted-foreground">Total {p.total}</div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Showing your {topPokemon.length} strongest Pokémon by total stats · {pokemon.length} owned total.{" "}
              <Link href="/inventory" className="text-primary underline-offset-4 hover:underline">
                View inventory →
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Battle Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><strong>{stats.botWins}</strong> bot wins</div>
              <div><strong>{stats.botLosses}</strong> bot losses</div>
              <div><strong>{stats.onlineWins}</strong> online wins</div>
              <div><strong>{stats.onlineLosses}</strong> online losses</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Matches</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {recentMatches.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No matches played yet. <Link href="/battle" className="text-primary underline-offset-4 hover:underline">Battle a bot →</Link>
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {recentMatches.map((m) => (
                  <li
                    key={m.id}
                    className={`rounded-md bg-muted px-2 py-1.5 text-sm border-l-3 ${m.won ? "border-l-primary" : "border-l-destructive"}`}
                  >
                    {m.won ? "🏆 Won" : "💀 Lost"} vs {m.mode === "bot" ? "a bot" : "another player"} —{" "}
                    {new Date(m.played_at).toLocaleString()}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">
              <Link href="/history" className="text-primary underline-offset-4 hover:underline">Full history →</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
