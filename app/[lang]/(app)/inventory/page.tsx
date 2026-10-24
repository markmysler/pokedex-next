import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getInventoryForUser } from "@/lib/inventory";
import { typesList } from "@/lib/pokedex";
import InventoryPageClient from "@/components/inventory/InventoryPageClient";

// InventoryPageClient reads the dictionary itself via useDictionary()
// (upgrades/55-i18n-collection-cluster.md) rather than receiving it as a
// prop here -- several of its entries are functions (e.g. showingCount,
// moveLine, computed from client-only state), and functions can't cross
// the Server->Client prop boundary the way step 54's plain-string
// dictionaries could.
export default async function InventoryPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = getSupabaseServerClient();
  const { pokemon } = await getInventoryForUser(supabase, user.id);

  return <InventoryPageClient initialPokemon={pokemon} typesList={typesList} />;
}
