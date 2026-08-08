import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import ProfilePageClient from "@/components/profile/ProfilePageClient";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = getSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, friend_code")
    .eq("user_id", user.id)
    .single();

  return (
    <ProfilePageClient
      email={user.email ?? ""}
      initialDisplayName={profile?.display_name ?? ""}
      friendCode={profile?.friend_code ?? ""}
    />
  );
}
