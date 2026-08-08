import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import SideNav from "@/components/nav/SideNav";
import { ToastProvider } from "@/components/ui/Toast";
import FriendNotifications from "@/components/friends/FriendNotifications";

// Shared shell for every authenticated page (dashboard/inventory/pokedex/
// battle/online/history/profile) — proxy.ts already redirects unauthenticated
// requests to /login before this ever renders; this guard is defense-in-depth
// since Server Components can in principle be reached directly.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = getSupabaseServerClient();
  const [{ data: profile }, { count: pendingFriendRequestCount }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("user_id", user.id).single(),
    supabase
      .from("friendships")
      .select("id", { count: "exact", head: true })
      .eq("addressee_id", user.id)
      .eq("status", "pending"),
  ]);

  const displayName = profile?.display_name ?? user.email ?? "Trainer";

  return (
    <div className="app-shell">
      <SideNav displayName={displayName} pendingFriendRequestCount={pendingFriendRequestCount ?? 0} />
      {/* ToastProvider/FriendNotifications are Client Components mounted
          here (wrapping children) since this layout itself is a Server
          Component and the app-wide notification subscription needs
          "use client" — see upgrades/05-friend-system.md. */}
      <ToastProvider>
        <FriendNotifications userId={user.id} />
        <main className="app-main">{children}</main>
      </ToastProvider>
    </div>
  );
}
