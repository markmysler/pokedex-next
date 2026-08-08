"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { useToast } from "@/components/ui/Toast";

interface FriendNotificationsProps {
  userId: string;
}

// Mounted once at the app-shell level (see app/(app)/layout.tsx) — keeps a
// Realtime subscription open on this account's channel for the whole
// authenticated session, so a friend request/acceptance/battle invite
// surfaces as a toast from anywhere in the app, not just the Friends page.
// Same subscription shape as useRoomChannel.ts, just account-scoped instead
// of room-scoped (upgrades/05-friend-system.md).
export default function FriendNotifications({ userId }: FriendNotificationsProps) {
  const { push } = useToast();
  const router = useRouter();
  const pushRef = useRef(push);

  useEffect(() => {
    pushRef.current = push;
  }, [push]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`user:${userId}`)
      .on("broadcast", { event: "friend-request" }, ({ payload }) => {
        const p = payload as { fromDisplayName: string };
        pushRef.current(
          <span>👋 <strong>{p.fromDisplayName}</strong> sent you a friend request. Check the Friends page to respond.</span>
        );
      })
      .on("broadcast", { event: "friend-request-accepted" }, ({ payload }) => {
        const p = payload as { fromDisplayName: string };
        pushRef.current(<span>✅ <strong>{p.fromDisplayName}</strong> accepted your friend request!</span>);
      })
      .on("broadcast", { event: "battle-invite" }, ({ payload }) => {
        const p = payload as { fromDisplayName: string; roomCode: string };
        pushRef.current(
          <BattleInviteToast fromDisplayName={p.fromDisplayName} roomCode={p.roomCode} router={router} pushRef={pushRef} />,
          20000
        );
      })
      .on("broadcast", { event: "friend-message" }, ({ payload }) => {
        const p = payload as { friendshipId: string; senderDisplayName: string; text: string };
        pushRef.current(
          <FriendMessageToast friendshipId={p.friendshipId} senderDisplayName={p.senderDisplayName} text={p.text} router={router} />
        );
      })
      .on("broadcast", { event: "trade-offer" }, ({ payload }) => {
        const p = payload as { friendshipId: string; fromDisplayName: string };
        pushRef.current(
          <FriendMessageToast
            friendshipId={p.friendshipId}
            senderDisplayName={p.fromDisplayName}
            text="proposed a trade!"
            icon="🔄"
            router={router}
          />
        );
      })
      .on("broadcast", { event: "trade-resolved" }, ({ payload }) => {
        const p = payload as { friendshipId: string; status: string };
        pushRef.current(<span>🔄 A trade was {p.status}.</span>);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, router]);

  return null;
}

interface BattleInviteToastProps {
  fromDisplayName: string;
  roomCode: string;
  router: ReturnType<typeof useRouter>;
  pushRef: RefObject<(content: ReactNode, durationMs?: number) => void>;
}

function BattleInviteToast({ fromDisplayName, roomCode, router, pushRef }: BattleInviteToastProps) {
  async function accept() {
    const res = await fetch(`/api/rooms/${roomCode}/join`, { method: "POST" });
    const data = await res.json();
    if (data.error) {
      pushRef.current(<span>⚠️ Couldn&apos;t join {fromDisplayName}&apos;s battle: {data.error}</span>);
      return;
    }
    router.push(`/online?code=${roomCode}`);
  }

  return (
    <span className="toast-invite">
      ⚔️ <strong>{fromDisplayName}</strong> invited you to battle!
      <button className="btn-primary toast-action" onClick={accept}>Accept</button>
    </span>
  );
}

interface FriendMessageToastProps {
  friendshipId: string;
  senderDisplayName: string;
  text: string;
  icon?: string;
  router: ReturnType<typeof useRouter>;
}

// Surfaces a friend DM (or a new trade offer, reusing the same shape) from
// anywhere in the app, not just an open chat window — same "toast/badge
// when the recipient's chat window isn't open" requirement step 5's friend
// requests already established (upgrades/12-friend-chat-trading.md).
function FriendMessageToast({ friendshipId, senderDisplayName, text, icon = "💬", router }: FriendMessageToastProps) {
  return (
    <span className="toast-invite">
      {icon} <strong>{senderDisplayName}</strong>: {text}
      <button className="btn-primary toast-action" onClick={() => router.push(`/friends/${friendshipId}`)}>
        Open
      </button>
    </span>
  );
}
