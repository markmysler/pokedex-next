import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getInventoryForUser } from "@/lib/inventory";
import OnlineBattle from "@/components/online/OnlineBattle";

export default async function OnlinePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = getSupabaseServerClient();
  const [{ pokemon }, { data: profile }] = await Promise.all([
    getInventoryForUser(supabase, user.id),
    supabase.from("profiles").select("display_name").eq("user_id", user.id).single(),
  ]);

  const displayName = profile?.display_name ?? user.email ?? "Trainer";

  return (
    <div className="page">
      <h1 className="page-title">🌐 Online Battle</h1>
      <OnlineBattle inventory={pokemon} displayName={displayName} />
    </div>
  );
}
