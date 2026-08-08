import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getInventoryForUser } from "@/lib/inventory";
import BattleArena from "@/components/battle/BattleArena";

export default async function BattlePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = getSupabaseServerClient();
  const { pokemon } = await getInventoryForUser(supabase, user.id);

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">⚔️ Battle Arena</h1>
      <BattleArena inventory={pokemon} />
    </div>
  );
}
