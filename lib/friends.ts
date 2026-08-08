import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export interface FriendEntry {
  friendshipId: string;
  userId: string;
  displayName: string;
}

export interface PendingRequestEntry {
  friendshipId: string;
  userId: string;
  displayName: string;
  createdAt: string;
}

export interface FriendsData {
  friends: FriendEntry[];
  incoming: PendingRequestEntry[];
  outgoing: PendingRequestEntry[];
}

// Shared by GET /api/friends and the /friends Server Component. Resolves
// the other party on every friendship row to a display_name the same way
// lib/history.ts/lib/leaderboard.ts do (never expose email/auth.users).
export async function getFriendsForUser(supabase: SupabaseClient<Database>, userId: string): Promise<FriendsData> {
  const { data, error } = await supabase
    .from("friendships")
    .select("*")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const otherIds = Array.from(new Set(rows.map((r) => (r.requester_id === userId ? r.addressee_id : r.requester_id))));

  const nameById = new Map<string, string>();
  if (otherIds.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", otherIds);
    for (const p of profiles ?? []) nameById.set(p.user_id, p.display_name);
  }

  const friends: FriendEntry[] = [];
  const incoming: PendingRequestEntry[] = [];
  const outgoing: PendingRequestEntry[] = [];

  for (const r of rows) {
    const otherId = r.requester_id === userId ? r.addressee_id : r.requester_id;
    const displayName = nameById.get(otherId) ?? "a departed player";
    if (r.status === "accepted") {
      friends.push({ friendshipId: r.id, userId: otherId, displayName });
    } else if (r.addressee_id === userId) {
      incoming.push({ friendshipId: r.id, userId: otherId, displayName, createdAt: r.created_at });
    } else {
      outgoing.push({ friendshipId: r.id, userId: otherId, displayName, createdAt: r.created_at });
    }
  }

  friends.sort((a, b) => a.displayName.localeCompare(b.displayName));
  incoming.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  outgoing.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return { friends, incoming, outgoing };
}
