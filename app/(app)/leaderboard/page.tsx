import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getLeaderboard } from "@/lib/leaderboard";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function LeaderboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = getSupabaseServerClient();
  const leaderboard = await getLeaderboard(supabase);

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">🏆 Leaderboard</h1>
      <Card>
        <CardContent>
          {leaderboard.length === 0 ? (
            <p className="text-sm text-muted-foreground">No trainers yet.</p>
          ) : (
            <ol className="flex flex-col gap-1">
              {leaderboard.map((entry, i) => (
                <li
                  key={entry.userId}
                  className={cn(
                    "grid grid-cols-[32px_1fr_auto] items-center gap-2.5 rounded-md bg-muted px-2.5 py-2 text-sm",
                    entry.userId === user.id && "ring-1 ring-primary"
                  )}
                >
                  <span className="text-center text-base">{MEDALS[i] ?? `#${i + 1}`}</span>
                  <span className="font-bold">{entry.displayName}{entry.userId === user.id ? " (you)" : ""}</span>
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {entry.wins} win{entry.wins === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
