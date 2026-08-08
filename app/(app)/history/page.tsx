import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getMatchHistoryForUser } from "@/lib/history";
import { Card, CardContent } from "@/components/ui/card";

export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = getSupabaseServerClient();
  const matches = await getMatchHistoryForUser(supabase, user.id);

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">📜 Battle History</h1>
      <Card>
        <CardContent>
          {matches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No matches played yet.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {matches.map((m) => (
                <li
                  key={m.id}
                  className={`flex flex-col gap-0.5 rounded-md bg-muted px-2 py-1.5 text-sm border-l-3 ${m.won ? "border-l-primary" : "border-l-destructive"}`}
                >
                  <div className="flex justify-between gap-2.5 font-bold">
                    <span>{m.won ? "🏆 Won" : "💀 Lost"} vs {m.opponentLabel}</span>
                    <span className="whitespace-nowrap font-normal text-muted-foreground">
                      {new Date(m.playedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {m.mode === "online" ? `Online${m.roomCode ? ` — room ${m.roomCode}` : ""}` : "vs Bot"}
                    {m.teamSnapshot && m.teamSnapshot.length > 0 && (
                      <> · Your team: {m.teamSnapshot.map((p) => p.name).join(", ")}</>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
