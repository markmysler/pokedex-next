import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getFriendsForUser } from "@/lib/friends";
import { getDictionary } from "@/lib/i18n/getDictionary";
import FriendsPageClient from "@/components/friends/FriendsPageClient";

// Only the page title is fetched here -- FriendsPageClient itself reads
// the dictionary via useDictionary() (upgrades/57-i18n-social-cluster.md),
// same reasoning as the Battle cluster's page/Client-component split.
export default async function FriendsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = getSupabaseServerClient();
  const [{ data: profile }, friendsData, dict] = await Promise.all([
    supabase.from("profiles").select("friend_code").eq("user_id", user.id).single(),
    getFriendsForUser(supabase, user.id),
    getDictionary(),
  ]);

  return (
    <div className="page">
      <h1 className="page-title">{dict.social.friends.heading}</h1>
      <FriendsPageClient myFriendCode={profile?.friend_code ?? ""} initial={friendsData} />
    </div>
  );
}
