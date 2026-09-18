import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getFriendsForUser } from "@/lib/friends";
import FriendsPageClient from "@/components/friends/FriendsPageClient";

export default async function FriendsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = getSupabaseServerClient();
  const [{ data: profile }, friendsData] = await Promise.all([
    supabase.from("profiles").select("friend_code").eq("user_id", user.id).single(),
    getFriendsForUser(supabase, user.id),
  ]);

  return (
    <div className="page">
      <h1 className="page-title">🤝 Friends</h1>
      <FriendsPageClient myFriendCode={profile?.friend_code ?? ""} initial={friendsData} />
    </div>
  );
}
