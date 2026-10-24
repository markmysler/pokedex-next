import type { ReactNode } from "react";
import Link from "next/link";
import { lang } from "next/root-params";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getNotificationsForUser, type NotificationEntry } from "@/lib/notifications";
import { getDictionary, type Dictionary } from "@/lib/i18n/getDictionary";
import MarkAllReadOnMount from "@/components/notifications/MarkAllReadOnMount";
import BattleInviteAcceptButton from "@/components/notifications/BattleInviteAcceptButton";
import SectionTabs from "@/components/nav/SectionTabs";
import Icon, { type IconName } from "@/components/ui/Icon";

interface RenderedNotification {
  icon: IconName;
  tone: "accent" | "good" | "info" | "warn";
  text: ReactNode;
  href: string | null;
}

// One kind-to-copy mapping instead of a per-kind component -- every kind
// has the same shape (icon, one sentence, optional link). The sender's
// display name stays as it was stored at send time (in the payload), so a
// later rename doesn't rewrite old notifications.
function renderNotification(n: NotificationEntry, dict: Dictionary): RenderedNotification {
  const p = n.payload;
  const t = dict.social.notifications;
  switch (n.kind) {
    case "friend-request":
      return { icon: "users", tone: "accent", text: <><strong>{String(p.fromDisplayName)}</strong> {t.friendRequestBody}</>, href: "/friends" };
    case "friend-request-accepted":
      return { icon: "check", tone: "good", text: <><strong>{String(p.fromDisplayName)}</strong> {t.friendRequestAcceptedBody}</>, href: "/friends" };
    case "friend-message":
      return { icon: "chat", tone: "info", text: <><strong>{String(p.senderDisplayName)}</strong>: {String(p.text)}</>, href: `/friends/${p.friendshipId}` };
    case "trade-offer":
      return { icon: "swap", tone: "warn", text: <><strong>{String(p.fromDisplayName)}</strong> {t.tradeProposedBody}</>, href: `/friends/${p.friendshipId}` };
    case "trade-resolved":
      return { icon: "swap", tone: "info", text: <>{t.tradeResolved(p.status as "accepted" | "declined" | "cancelled")}</>, href: `/friends/${p.friendshipId}` };
    case "battle-invite":
      return { icon: "swords", tone: "accent", text: <><strong>{String(p.fromDisplayName)}</strong> {t.battleInviteBody}</>, href: null };
  }
}

// Notifications (redesign wave v9): grouped into Today and Earlier, each
// with its one action inline. Opening the page marks everything read.
export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const currentLang = await lang();
  const dict = await getDictionary();
  const t = dict.social.notifications;
  const supabase = getSupabaseServerClient();
  const notifications = await getNotificationsForUser(supabase, user.id);
  const timeFormat = new Intl.DateTimeFormat(currentLang, { hour: "2-digit", minute: "2-digit" });
  const dateFormat = new Intl.DateTimeFormat(currentLang, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const groups = [
    { key: "today", title: t.today, items: notifications.filter((n) => new Date(n.createdAt) >= startOfToday) },
    { key: "earlier", title: t.earlier, items: notifications.filter((n) => new Date(n.createdAt) < startOfToday) },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="page page-narrow">
      <MarkAllReadOnMount />
      <div className="page-head">
        <div>
          <span className="eyebrow">{dict.shell.groups.social}</span>
          <h1>{t.heading}</h1>
        </div>
      </div>
      <SectionTabs section="social" />

      {groups.length === 0 ? (
        <div className="panel">
          <div className="empty">
            <Icon name="bell" size={32} />
            <h3>{t.empty}</h3>
            <p>{t.emptyBody}</p>
          </div>
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.key} className="stack" style={{ gap: 8 }}>
            <h2 className="eyebrow">{group.title}</h2>
            <ul className="panel panel-flush rows">
              {group.items.map((n) => {
                const r = renderNotification(n, dict);
                const time = (group.key === "today" ? timeFormat : dateFormat).format(new Date(n.createdAt));
                return (
                  <li key={n.id} className={`notif-row${n.read ? "" : " is-unread"}`}>
                    <span className={`notif-icon tone-${r.tone}`}><Icon name={r.icon} size={16} /></span>
                    <div className="notif-main">
                      <span>{r.text}</span>
                      <span className="mono small faint">{time}</span>
                    </div>
                    {n.kind === "battle-invite" ? (
                      n.battleInviteJoinable ? (
                        <BattleInviteAcceptButton roomCode={String(n.payload.roomCode)} />
                      ) : (
                        <span className="small faint">{t.inviteUnavailable}</span>
                      )
                    ) : (
                      r.href && (
                        <Link className="btn-ghost btn-sm" href={`/${currentLang}${r.href}`}>
                          {t.open} <Icon name="chevronRight" size={14} />
                        </Link>
                      )
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
