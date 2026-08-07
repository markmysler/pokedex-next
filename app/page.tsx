import { pokedex, pokedexOrder, typesList } from "@/lib/pokedex";
import PokedexApp from "@/components/pokedex/PokedexApp";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

export default async function Home() {
  const user = await getCurrentUser();
  // proxy.ts already redirects unauthenticated requests to /login before
  // this ever renders — this guard is just defense-in-depth, since Server
  // Components can in principle be reached directly.
  if (!user) return null;

  const supabase = getSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .single();

  return (
    <div id="app">
      <PokedexApp
        pokedex={pokedex}
        order={pokedexOrder}
        typesList={typesList}
        displayName={profile?.display_name ?? user.email ?? "Trainer"}
      />
    </div>
  );
}
