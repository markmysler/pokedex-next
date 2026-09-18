import { Suspense } from "react";
import { redirect } from "next/navigation";
import { lang } from "next/root-params";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import SideNav from "@/components/nav/SideNav";
import { ToastProvider } from "@/components/ui/Toast";
import FriendNotifications from "@/components/friends/FriendNotifications";
import WelcomeDialog from "@/components/onboarding/WelcomeDialog";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { getDictionary } from "@/lib/i18n/getDictionary";

// Shared shell for every authenticated page (dashboard/inventory/pokedex/
// battle/online/history/profile) — proxy.ts already redirects unauthenticated
// requests to /login before this ever renders; this guard is defense-in-depth
// since Server Components can in principle be reached directly.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/${await lang()}/login`);

  const supabase = getSupabaseServerClient();
  const [{ data: profile }, { count: pendingFriendRequestCount }, unreadNotificationCount, dict] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("user_id", user.id).single(),
    supabase
      .from("friendships")
      .select("id", { count: "exact", head: true })
      .eq("addressee_id", user.id)
      .eq("status", "pending"),
    getUnreadNotificationCount(supabase, user.id),
    getDictionary(),
  ]);

  const displayName = profile?.display_name ?? user.email ?? dict.account.profile.trainerFallback;

  return (
    <div className="app-shell">
      <SideNav
        displayName={displayName}
        pendingFriendRequestCount={pendingFriendRequestCount ?? 0}
        unreadNotificationCount={unreadNotificationCount}
        dict={dict.common}
      />
      {/* ToastProvider/FriendNotifications are Client Components mounted
          here (wrapping children) since this layout itself is a Server
          Component and the app-wide notification subscription needs
          "use client" — see upgrades/05-friend-system.md. */}
      <ToastProvider>
        <FriendNotifications userId={user.id} />
        <Suspense fallback={null}>
          <WelcomeDialog dict={dict.account.welcome} />
        </Suspense>
        <main className="app-main">{children}</main>
      </ToastProvider>
    </div>
  );
}
