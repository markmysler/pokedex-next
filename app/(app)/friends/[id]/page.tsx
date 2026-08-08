import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getFriendshipForUser } from "@/lib/friends";
import { getInventoryForUser } from "@/lib/inventory";
import { typesList } from "@/lib/pokedex";
import FriendChatPageClient from "@/components/friends/FriendChatPageClient";
import type { OwnedPokemon } from "@/types/pokemon";

export default async function FriendChatPage({ params }: PageProps<"/friends/[id]">) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = getSupabaseServerClient();

  const friendship = await getFriendshipForUser(supabase, id, user.id);
  if (!friendship || friendship.status !== "accepted") {
    return (
      <div className="page">
        <h1 className="page-title">🤝 Friends</h1>
        <div className="card">
          <p>This friendship doesn&apos;t exist, isn&apos;t confirmed yet, or isn&apos;t yours to view.</p>
          <Link href="/friends">← Back to Friends</Link>
        </div>
      </div>
    );
  }

  const [{ data: friendProfile }, myInventory, friendInventory, messagesRes, tradesRes] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("user_id", friendship.otherUserId).single(),
    getInventoryForUser(supabase, user.id),
    getInventoryForUser(supabase, friendship.otherUserId),
    supabase
      .from("friend_messages")
      .select("*")
      .eq("friendship_id", id)
      .order("created_at", { ascending: true })
      .limit(200),
    supabase.from("trade_offers").select("*").eq("friendship_id", id).eq("status", "pending").order("created_at", { ascending: false }),
  ]);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .in("user_id", [user.id, friendship.otherUserId]);
  const nameById = new Map((profiles ?? []).map((p) => [p.user_id, p.display_name]));

  const initialMessages = (messagesRes.data ?? []).map((r) => ({
    text: r.text,
    senderDisplayName: nameById.get(r.sender_id) ?? "a departed player",
    mine: r.sender_id === user.id,
  }));

  // Both parties' *current* inventories already cover every id a pending
  // trade could reference — a stale id (already discarded/traded away)
  // simply won't resolve here, same "preview only" reasoning
  // GET /api/friends/[id]/trades uses.
  const allPokemonById = new Map([...myInventory.pokemon, ...friendInventory.pokemon].map((p) => [p.id, p]));
  const initialTrades = (tradesRes.data ?? []).map((r) => ({
    id: r.id,
    offeredBy: r.offered_by,
    isMine: r.offered_by === user.id,
    offered: (r.offered_instance_ids as string[]).map((iid) => allPokemonById.get(iid)).filter((p): p is OwnedPokemon => Boolean(p)),
    requested: (r.requested_instance_ids as string[]).map((iid) => allPokemonById.get(iid)).filter((p): p is OwnedPokemon => Boolean(p)),
    createdAt: r.created_at,
  }));

  return (
    <div className="page">
      <h1 className="page-title">💬 {friendProfile?.display_name ?? "Friend"}</h1>
      <FriendChatPageClient
        friendshipId={id}
        myUserId={user.id}
        friendDisplayName={friendProfile?.display_name ?? "a departed player"}
        initialMessages={initialMessages}
        initialTrades={initialTrades}
        myInventory={myInventory.pokemon}
        friendInventory={friendInventory.pokemon}
        typesList={typesList}
      />
    </div>
  );
}
