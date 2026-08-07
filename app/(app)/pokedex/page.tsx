import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getUserPokedexData } from "@/lib/userPokedexData";
import { pokedex, pokedexOrder, typesList } from "@/lib/pokedex";
import PokedexPageClient from "@/components/pokedex/PokedexPageClient";

export default async function PokedexPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = getSupabaseServerClient();
  const userData = await getUserPokedexData(supabase, user.id);

  return (
    <PokedexPageClient pokedex={pokedex} order={pokedexOrder} typesList={typesList} initialUserData={userData} />
  );
}
