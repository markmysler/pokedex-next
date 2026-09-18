import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getUserPokedexData } from "@/lib/userPokedexData";
import { pokedex, pokedexOrder, typesList } from "@/lib/pokedex";
import PokedexPageClient from "@/components/pokedex/PokedexPageClient";

// PokedexPageClient reads the dictionary itself via useDictionary()
// (upgrades/55-i18n-collection-cluster.md) rather than receiving it as a
// prop here -- several of its entries are functions (e.g. showingCount,
// computed from client-only filter state), and functions can't cross the
// Server->Client prop boundary the way step 54's plain-string dictionaries
// could.
export default async function PokedexPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = getSupabaseServerClient();
  const userData = await getUserPokedexData(supabase, user.id);

  return (
    <PokedexPageClient pokedex={pokedex} order={pokedexOrder} typesList={typesList} initialUserData={userData} />
  );
}
