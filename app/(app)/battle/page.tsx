import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getInventoryForUser } from "@/lib/inventory";
import { typesList } from "@/lib/pokedex";
import BattleArena from "@/components/battle/BattleArena";

export default async function BattlePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = getSupabaseServerClient();
  const { pokemon } = await getInventoryForUser(supabase, user.id);

  return (
    <div className="page">
      <h1 className="page-title">⚔️ Battle Arena</h1>
      <BattleArena inventory={pokemon} typesList={typesList} />
    </div>
  );
}
