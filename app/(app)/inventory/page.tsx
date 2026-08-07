import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getInventoryForUser } from "@/lib/inventory";
import { typesList } from "@/lib/pokedex";
import InventoryPageClient from "@/components/inventory/InventoryPageClient";

export default async function InventoryPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = getSupabaseServerClient();
  const { pokemon, lootboxes } = await getInventoryForUser(supabase, user.id);

  return <InventoryPageClient initialPokemon={pokemon} initialLootboxes={lootboxes} typesList={typesList} />;
}
