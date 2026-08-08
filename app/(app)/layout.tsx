import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import SideNav from "@/components/nav/SideNav";

// Shared shell for every authenticated page (dashboard/inventory/pokedex/
// battle/online/history/profile) — proxy.ts already redirects unauthenticated
// requests to /login before this ever renders; this guard is defense-in-depth
// since Server Components can in principle be reached directly.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = getSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .single();

  const displayName = profile?.display_name ?? user.email ?? "Trainer";

  return (
    <div className="app-shell">
      <SideNav displayName={displayName} />
      <main className="app-main">{children}</main>
    </div>
  );
}
