import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getInventoryForUser } from "@/lib/inventory";
import { typesList } from "@/lib/pokedex";
import { getDictionary } from "@/lib/i18n/getDictionary";
import BattleArena from "@/components/battle/BattleArena";

// Only the page title is fetched here (a plain string, safe as a Server->
// Client prop) -- BattleArena itself reads the dictionary via
// useDictionary() (upgrades/56-i18n-battle-cluster.md), since several of
// its entries are functions that can't cross that boundary.
export default async function BattlePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = getSupabaseServerClient();
  const [{ pokemon }, dict] = await Promise.all([getInventoryForUser(supabase, user.id), getDictionary()]);

  return (
    <div className="page">
      <h1 className="page-title">{dict.battle.arena.title}</h1>
      <BattleArena inventory={pokemon} typesList={typesList} />
    </div>
  );
}
