import type { ReactNode } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getNotificationsForUser, type NotificationEntry } from "@/lib/notifications";
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
function renderNotification(n: NotificationEntry): RenderedNotification {
  const p = n.payload;
  switch (n.kind) {
    case "friend-request":
      return { icon: "👋", text: <><strong>{String(p.fromDisplayName)}</strong> sent you a friend request.</>, href: "/friends" };
    case "friend-request-accepted":
      return { icon: "✅", text: <><strong>{String(p.fromDisplayName)}</strong> accepted your friend request!</>, href: "/friends" };
    case "friend-message":
      return { icon: "💬", text: <><strong>{String(p.senderDisplayName)}</strong>: {String(p.text)}</>, href: `/friends/${p.friendshipId}` };
    case "trade-offer":
      return { icon: "🔄", text: <><strong>{String(p.fromDisplayName)}</strong> proposed a trade.</>, href: `/friends/${p.friendshipId}` };
    case "trade-resolved":
      return { icon: "🔄", text: <>A trade was {String(p.status)}.</>, href: `/friends/${p.friendshipId}` };
    case "battle-invite":
      return { icon: "⚔️", text: <><strong>{String(p.fromDisplayName)}</strong> invited you to battle!</>, href: null };
  }
}

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = getSupabaseServerClient();
  const notifications = await getNotificationsForUser(supabase, user.id);

  return (
    <div className="page">
      <MarkAllReadOnMount />
      <h1 className="page-title">🔔 Notifications</h1>
      <div className="card">
        {notifications.length === 0 ? (
          <p>No notifications yet.</p>
        ) : (
          <ul className="notification-list">
            {notifications.map((n) => {
              const rendered = renderNotification(n);
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
                      <p className="notification-row-unavailable">This invite is no longer available.</p>
                    )
                  ) : (
                    rendered.href && (
                      <Link className="btn-secondary" href={rendered.href}>
                        Open
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
