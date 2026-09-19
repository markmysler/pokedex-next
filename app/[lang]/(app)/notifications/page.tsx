import type { ReactNode } from "react";
import Link from "next/link";
import { lang } from "next/root-params";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getNotificationsForUser, type NotificationEntry } from "@/lib/notifications";
import { getDictionary, type Dictionary } from "@/lib/i18n/getDictionary";
import MarkAllReadOnMount from "@/components/notifications/MarkAllReadOnMount";
import BattleInviteAcceptButton from "@/components/notifications/BattleInviteAcceptButton";

interface RenderedNotification {
  icon: string;
  text: ReactNode;
  href: string | null;
}

// Every kind here mirrors what FriendNotifications.tsx's toast already
// shows for the same event, just from the persisted payload instead of a
// live broadcast (upgrades/17-persistent-notifications.md). Only
// battle-invite gets a real inline action -- every other kind already has
// a proper persisted, browsable home elsewhere (incoming requests on
// /friends, trades/messages on /friends/[id]), so this links out to that
// rather than duplicating its accept/decline UI here.
//
// Called directly from this Server Component's own render (not passed as a
// prop across a Server->Client boundary), so `dict`'s function-valued
// entries are never serialized -- only the ReactNode this returns is
// (upgrades/57-i18n-social-cluster.md, same lesson as steps 55-56).
function renderNotification(n: NotificationEntry, dict: Dictionary): RenderedNotification {
  const p = n.payload;
  const t = dict.social.notifications;
  switch (n.kind) {
    case "friend-request":
      return { icon: "👋", text: <><strong>{String(p.fromDisplayName)}</strong> {t.friendRequestBody}</>, href: "/friends" };
    case "friend-request-accepted":
      return { icon: "✅", text: <><strong>{String(p.fromDisplayName)}</strong> {t.friendRequestAcceptedBody}</>, href: "/friends" };
    case "friend-message":
      // `p.text` is the sender's own message body -- user-generated
      // content, never translated (same as a friend's display name).
      return { icon: "💬", text: <><strong>{String(p.senderDisplayName)}</strong>: {String(p.text)}</>, href: `/friends/${p.friendshipId}` };
    case "trade-offer":
      return { icon: "🔄", text: <><strong>{String(p.fromDisplayName)}</strong> {t.tradeProposedBody}</>, href: `/friends/${p.friendshipId}` };
    case "trade-resolved":
      return { icon: "🔄", text: <>{t.tradeResolved(p.status as "accepted" | "declined" | "cancelled")}</>, href: `/friends/${p.friendshipId}` };
    case "battle-invite":
      return { icon: "⚔️", text: <><strong>{String(p.fromDisplayName)}</strong> {t.battleInviteBody}</>, href: null };
  }
}

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const currentLang = await lang();
  const dict = await getDictionary();
  const t = dict.social.notifications;
  const supabase = getSupabaseServerClient();
  const notifications = await getNotificationsForUser(supabase, user.id);

  return (
    <div className="page">
      <MarkAllReadOnMount />
      <h1 className="page-title">{t.heading}</h1>
      <div className="card">
        {notifications.length === 0 ? (
          <p>{t.empty}</p>
        ) : (
          <ul className="notification-list">
            {notifications.map((n) => {
              const rendered = renderNotification(n, dict);
              return (
                <li key={n.id} className={`notification-row${n.read ? "" : " unread"}`}>
                  <span className="notification-row-icon">{rendered.icon}</span>
                  <div className="notification-row-main">
                    <span className="notification-row-text">{rendered.text}</span>
                    <span className="notification-row-date">{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                  {n.kind === "battle-invite" ? (
                    n.battleInviteJoinable ? (
                      <BattleInviteAcceptButton roomCode={String(n.payload.roomCode)} />
                    ) : (
                      <p className="notification-row-unavailable">{t.inviteUnavailable}</p>
                    )
                  ) : (
                    rendered.href && (
                      <Link className="btn-secondary" href={`/${currentLang}${rendered.href}`}>
                        {t.open}
                      </Link>
                    )
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
