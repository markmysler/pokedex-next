import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getInventoryForUser } from "@/lib/inventory";
import { typesList } from "@/lib/pokedex";
import { getDictionary } from "@/lib/i18n/getDictionary";
import SectionTabs from "@/components/nav/SectionTabs";
import BattleArena from "@/components/battle/BattleArena";

export default async function BattlePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = getSupabaseServerClient();
  const [{ pokemon }, dict] = await Promise.all([getInventoryForUser(supabase, user.id), getDictionary()]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">{dict.battle.arena.subtitle}</span>
          <h1>{dict.battle.arena.title}</h1>
        </div>
      </div>
      <SectionTabs section="battle" />
      <BattleArena inventory={pokemon} typesList={typesList} />
    </div>
  );
}
