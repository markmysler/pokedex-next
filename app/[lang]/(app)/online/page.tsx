import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getInventoryForUser } from "@/lib/inventory";
import { typesList } from "@/lib/pokedex";
import { getDictionary } from "@/lib/i18n/getDictionary";
import SectionTabs from "@/components/nav/SectionTabs";
import OnlineBattle from "@/components/online/OnlineBattle";

// Only the page title is fetched here -- OnlineBattle itself reads the
// dictionary via useDictionary() (upgrades/56-i18n-battle-cluster.md), same
// reasoning as BattlePage.
export default async function OnlinePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = getSupabaseServerClient();
  const [{ pokemon }, { data: profile }, dict] = await Promise.all([
    getInventoryForUser(supabase, user.id),
    supabase.from("profiles").select("display_name").eq("user_id", user.id).single(),
    getDictionary(),
  ]);

  const displayName = profile?.display_name ?? user.email ?? dict.account.profile.trainerFallback;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">{dict.battle.online.subtitle}</span>
          <h1>{dict.battle.online.title}</h1>
        </div>
      </div>
      <SectionTabs section="battle" />
      <OnlineBattle inventory={pokemon} displayName={displayName} typesList={typesList} />
    </div>
  );
}
