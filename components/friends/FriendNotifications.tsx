"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { useToast } from "@/components/ui/Toast";
import { localeFromPathname, withLocale, type Locale } from "@/lib/i18n/locale";
import { useDictionary } from "@/lib/i18n/useDictionary";
import Icon, { type IconName } from "@/components/ui/Icon";

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
  const locale = localeFromPathname(usePathname());
  const dict = useDictionary();
  const pushRef = useRef(push);
  const dictRef = useRef(dict);

  useEffect(() => {
    pushRef.current = push;
  }, [push]);

  useEffect(() => {
    dictRef.current = dict;
  }, [dict]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`user:${userId}`, { config: { private: true } })
      .on("broadcast", { event: "friend-request" }, ({ payload }) => {
        const p = payload as { fromDisplayName: string };
        const t = dictRef.current.social.notifications;
        pushRef.current(<span className="toast-line"><Icon name="users" size={16} /> <span><strong>{p.fromDisplayName}</strong> {t.toastFriendRequestBody}</span></span>);
      })
      .on("broadcast", { event: "friend-request-accepted" }, ({ payload }) => {
        const p = payload as { fromDisplayName: string };
        const t = dictRef.current.social.notifications;
        pushRef.current(<span className="toast-line"><Icon name="check" size={16} /> <span><strong>{p.fromDisplayName}</strong> {t.friendRequestAcceptedBody}</span></span>);
      })
      .on("broadcast", { event: "battle-invite" }, ({ payload }) => {
        const p = payload as { fromDisplayName: string; roomCode: string };
        const t = dictRef.current.social.notifications;
        pushRef.current(
          <BattleInviteToast
            fromDisplayName={p.fromDisplayName}
            roomCode={p.roomCode}
            router={router}
            locale={locale}
            pushRef={pushRef}
            battleInviteBody={t.battleInviteBody}
            acceptLabel={t.accept}
            joinFailed={t.toastJoinFailed}
          />,
          20000
        );
      })
      .on("broadcast", { event: "friend-message" }, ({ payload }) => {
        const p = payload as { friendshipId: string; senderDisplayName: string; text: string };
        pushRef.current(
          <FriendMessageToast friendshipId={p.friendshipId} senderDisplayName={p.senderDisplayName} text={p.text} router={router} locale={locale} openLabel={dictRef.current.social.notifications.open} />
        );
      })
      .on("broadcast", { event: "trade-offer" }, ({ payload }) => {
        const p = payload as { friendshipId: string; fromDisplayName: string };
        const t = dictRef.current.social.notifications;
        pushRef.current(
          <FriendMessageToast
            friendshipId={p.friendshipId}
            senderDisplayName={p.fromDisplayName}
            text={t.toastTradeProposedBody}
            icon="swap"
            router={router}
            locale={locale}
            openLabel={t.open}
          />
        );
      })
      .on("broadcast", { event: "trade-resolved" }, ({ payload }) => {
        const p = payload as { friendshipId: string; status: "accepted" | "declined" | "cancelled" };
        const t = dictRef.current.social.notifications;
        pushRef.current(<span className="toast-line"><Icon name="swap" size={16} /> <span>{t.tradeResolved(p.status)}</span></span>);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, router, locale]);

  return null;
}

interface BattleInviteToastProps {
  fromDisplayName: string;
  roomCode: string;
  router: ReturnType<typeof useRouter>;
  locale: Locale;
  pushRef: RefObject<(content: ReactNode, durationMs?: number) => void>;
  // Resolved by the caller (inside the channel event handler, not this
  // component's own render) rather than a dictRef read here directly --
  // reading a ref's .current during render trips react-hooks/refs (ESLint
  // caught this once, see upgrades/57-i18n-social-cluster.md), since this
  // is a real component render, not the effect closure that constructs it.
  battleInviteBody: string;
  acceptLabel: string;
  joinFailed: (name: string, error: string) => string;
}

function BattleInviteToast({ fromDisplayName, roomCode, router, locale, pushRef, battleInviteBody, acceptLabel, joinFailed }: BattleInviteToastProps) {
  async function accept() {
    const res = await fetch(`/api/rooms/${roomCode}/join`, { method: "POST" });
    const data = await res.json();
    if (data.error) {
      pushRef.current(<span>{joinFailed(fromDisplayName, data.error)}</span>);
      return;
    }
    router.push(withLocale(locale, `/online?code=${roomCode}`));
  }

  return (
    <span className="toast-invite">
      <span className="toast-line"><Icon name="swords" size={16} /> <span><strong>{fromDisplayName}</strong> {battleInviteBody}</span></span>
      <button className="btn-primary btn-sm" onClick={accept}>{acceptLabel}</button>
    </span>
  );
}

interface FriendMessageToastProps {
  friendshipId: string;
  senderDisplayName: string;
  text: string;
  icon?: IconName;
  router: ReturnType<typeof useRouter>;
  locale: Locale;
  openLabel: string;
}

// Surfaces a friend DM (or a new trade offer, reusing the same shape) from
// anywhere in the app, not just an open chat window — same "toast/badge
// when the recipient's chat window isn't open" requirement step 5's friend
// requests already established (upgrades/12-friend-chat-trading.md). `text`
// is either the sender's own message body (user-generated, never
// translated) or an already-localized trade-offer sentence -- either way
// this component just renders it verbatim.
function FriendMessageToast({ friendshipId, senderDisplayName, text, icon = "chat", router, locale, openLabel }: FriendMessageToastProps) {
  return (
    <span className="toast-invite">
      <span className="toast-line"><Icon name={icon} size={16} /> <span><strong>{senderDisplayName}</strong>: {text}</span></span>
      <button className="btn-primary btn-sm" onClick={() => router.push(withLocale(locale, `/friends/${friendshipId}`))}>
        {openLabel}
      </button>
    </span>
  );
}
