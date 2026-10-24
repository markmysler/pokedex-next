"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { FriendsData } from "@/lib/friends";
import { localeFromPathname, withLocale } from "@/lib/i18n/locale";
import { useDictionary } from "@/lib/i18n/useDictionary";
import Link from "@/components/LocaleLink";
import Icon from "@/components/ui/Icon";
import CopyCode from "@/components/ui/CopyCode";

interface FriendsPageClientProps {
  myFriendCode: string;
  initial: FriendsData;
}

function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

// Friends (redesign wave v9): requests and your friends as the main
// column, with your own code and "add a friend" beside them. Battle
// creates a room and sends the invite, as before.
export default function FriendsPageClient({ myFriendCode, initial }: FriendsPageClientProps) {
  const dict = useDictionary();
  const t = dict.social.friends;
  const router = useRouter();
  const locale = localeFromPathname(usePathname());
  const [data, setData] = useState(initial);
  const [codeInput, setCodeInput] = useState("");
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/friends");
    const fresh = await res.json();
    if (!fresh.error) setData(fresh);
  }

  async function sendRequest(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    const code = codeInput.trim().toUpperCase();
    if (!code) return setStatus({ text: t.enterCodeFirst, ok: false });
    const res = await fetch("/api/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendCode: code }),
    });
    const result = await res.json();
    if (result.error) return setStatus({ text: t.genericError(result.error), ok: false });
    setCodeInput("");
    setStatus({ text: result.status === "accepted" ? t.nowFriends : t.requestSent, ok: true });
    refresh();
  }

  async function respond(friendshipId: string, accept: boolean) {
    setBusyId(friendshipId);
    await fetch(`/api/friends/${friendshipId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accept }),
    });
    setBusyId(null);
    refresh();
  }

  async function remove(friendshipId: string) {
    setBusyId(friendshipId);
    await fetch(`/api/friends/${friendshipId}`, { method: "DELETE" });
    setBusyId(null);
    refresh();
  }

  // Creates a room, invites the friend to it, then takes you to the room
  // as its host.
  async function battle(friendUserId: string) {
    setStatus(null);
    setBusyId(friendUserId);
    const roomRes = await fetch("/api/rooms", { method: "POST" });
    const room = await roomRes.json();
    if (room.error) {
      setBusyId(null);
      return setStatus({ text: t.genericError(room.error), ok: false });
    }
    const inviteRes = await fetch("/api/friends/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendUserId, roomCode: room.roomCode }),
    });
    const invite = await inviteRes.json();
    setBusyId(null);
    if (invite.error) return setStatus({ text: t.genericError(invite.error), ok: false });
    router.push(withLocale(locale, `/online?code=${room.roomCode}&host=1`));
  }

  return (
    <div className="friends-layout">
      <div className="stack" style={{ gap: 16 }}>
        {status && <p className={`alert ${status.ok ? "alert-good" : "alert-error"}`} role="status">{status.text}</p>}

        {data.incoming.length > 0 && (
          <section className="panel panel-flush">
            <div className="panel-head"><h2>{t.incomingRequests}</h2></div>
            <ul className="rows">
              {data.incoming.map((r) => (
                <li key={r.friendshipId} className="list-row">
                  <span className="avatar avatar-sm">{initials(r.displayName)}</span>
                  <span className="list-row-main strong">{r.displayName}</span>
                  <span className="row" style={{ flexWrap: "nowrap" }}>
                    <button className="btn-primary btn-sm" disabled={busyId === r.friendshipId} onClick={() => respond(r.friendshipId, true)}>{t.accept}</button>
                    <button className="btn-ghost btn-sm" disabled={busyId === r.friendshipId} onClick={() => respond(r.friendshipId, false)}>{t.decline}</button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="panel panel-flush">
          <div className="panel-head"><h2>{t.friendsCount(data.friends.length)}</h2></div>
          {data.friends.length === 0 ? (
            <div className="empty">
              <Icon name="users" size={32} />
              <p>{t.noFriendsYet}</p>
            </div>
          ) : (
            <ul className="rows">
              {data.friends.map((f) => (
                <li key={f.friendshipId} className="list-row">
                  <span className="avatar avatar-sm">{initials(f.displayName)}</span>
                  <span className="list-row-main strong">{f.displayName}</span>
                  <span className="row friend-actions">
                    <button className="btn-primary btn-sm" disabled={busyId === f.userId} onClick={() => battle(f.userId)}>
                      <Icon name="swords" size={14} /> {t.battle}
                    </button>
                    <Link href={`/friends/${f.friendshipId}`} className="btn-secondary btn-sm">
                      <Icon name="chat" size={14} /> {t.chat}
                    </Link>
                    <button className="icon-btn icon-btn-plain" disabled={busyId === f.friendshipId} onClick={() => remove(f.friendshipId)} title={t.remove} aria-label={`${t.remove} ${f.displayName}`}>
                      <Icon name="trash" size={16} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {data.outgoing.length > 0 && (
          <section className="panel panel-flush">
            <div className="panel-head"><h2>{t.outgoingRequests}</h2></div>
            <ul className="rows">
              {data.outgoing.map((r) => (
                <li key={r.friendshipId} className="list-row">
                  <span className="avatar avatar-sm">{initials(r.displayName)}</span>
                  <span className="list-row-main">
                    <span className="strong">{r.displayName}</span> <span className="small faint">· {t.pendingLabel}</span>
                  </span>
                  <button className="btn-ghost btn-sm" disabled={busyId === r.friendshipId} onClick={() => remove(r.friendshipId)}>{t.cancelRequest}</button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <aside className="stack" style={{ gap: 16 }}>
        <section className="panel stack">
          <h2 style={{ fontSize: 16 }}>{t.yourFriendCode}</h2>
          <CopyCode code={myFriendCode} copyLabel={t.copy} copiedLabel={t.copied} />
          <p className="small muted">{t.shareCodeNote}</p>
        </section>
        <form className="panel stack" onSubmit={sendRequest}>
          <h2 style={{ fontSize: 16 }}>{t.addFriend}</h2>
          <p className="small muted">{t.addFriendBody}</p>
          <div className="row" style={{ flexWrap: "nowrap" }}>
            <input className="code-input" value={codeInput} onChange={(e) => setCodeInput(e.target.value)} maxLength={6} placeholder={t.codePlaceholder} aria-label={t.codePlaceholder} />
            <button className="btn-primary" type="submit">{t.sendRequest}</button>
          </div>
        </form>
      </aside>
    </div>
  );
}
