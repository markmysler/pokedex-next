import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getInventoryForUser } from "@/lib/inventory";
import OnlineBattle from "@/components/online/OnlineBattle";

export default async function OnlinePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = getSupabaseServerClient();
  const { pokemon } = await getInventoryForUser(supabase, user.id);

  return (
    <div className="page">
      <h1 className="page-title">🌐 Online Battle</h1>
      <OnlineBattle inventory={pokemon} />
    </div>
  );
}
