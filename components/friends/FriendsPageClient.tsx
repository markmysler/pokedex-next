"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { FriendsData } from "@/lib/friends";
import CardTab from "@/components/ui/CardTab";
import { localeFromPathname, withLocale } from "@/lib/i18n/locale";
import { useDictionary } from "@/lib/i18n/useDictionary";
import Link from "@/components/LocaleLink";

interface FriendsPageClientProps {
  myFriendCode: string;
  initial: FriendsData;
}

export default function FriendsPageClient({ myFriendCode, initial }: FriendsPageClientProps) {
  const dict = useDictionary();
  const t = dict.social.friends;
  const router = useRouter();
  const locale = localeFromPathname(usePathname());
  const [data, setData] = useState(initial);
  const [codeInput, setCodeInput] = useState("");
  const [status, setStatus] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/friends");
    const fresh = await res.json();
    if (!fresh.error) setData(fresh);
  }

  async function sendRequest() {
    setStatus("");
    const code = codeInput.trim().toUpperCase();
    if (!code) return setStatus(t.enterCodeFirst);
    const res = await fetch("/api/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendCode: code }),
    });
    const result = await res.json();
    if (result.error) return setStatus(t.genericError(result.error));
    setCodeInput("");
    setStatus(result.status === "accepted" ? t.nowFriends : t.requestSent);
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

  async function battle(friendUserId: string) {
    setStatus("");
    setBusyId(friendUserId);
    const roomRes = await fetch("/api/rooms", { method: "POST" });
    const room = await roomRes.json();
    if (room.error) {
      setBusyId(null);
      return setStatus(t.genericError(room.error));
    }
    const inviteRes = await fetch("/api/friends/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendUserId, roomCode: room.roomCode }),
    });
    const invite = await inviteRes.json();
    setBusyId(null);
    if (invite.error) return setStatus(t.genericError(invite.error));
    router.push(withLocale(locale, `/online?code=${room.roomCode}&host=1`));
  }

  return (
    <>
      <div className="card">
        <CardTab icon="🔑" label={t.yourFriendCode} />
        <p className="friend-code-display">{myFriendCode}</p>
        <p className="online-status">{t.shareCodeNote}</p>
      </div>

      <div className="card">
        <CardTab icon="➕" label={t.addFriend} />
        <div className="online-join-row">
          <input
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            maxLength={6}
            placeholder={t.codePlaceholder}
          />
          <button className="btn-primary" onClick={sendRequest}>{t.sendRequest}</button>
        </div>
        {status && <div className="online-status">{status}</div>}
      </div>

      {data.incoming.length > 0 && (
        <div className="card">
          <CardTab icon="📥" label={t.incomingRequests} />
          {data.incoming.map((r) => (
            <div key={r.friendshipId} className="friend-row">
              <div className="friend-row-identity">
                <span className="avatar-sm">👤</span>
                <span>{r.displayName}</span>
              </div>
              <div className="friend-row-actions">
                <button className="btn-primary" disabled={busyId === r.friendshipId} onClick={() => respond(r.friendshipId, true)}>
                  {t.accept}
                </button>
                <button className="btn-secondary" disabled={busyId === r.friendshipId} onClick={() => respond(r.friendshipId, false)}>
                  {t.decline}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {data.outgoing.length > 0 && (
        <div className="card">
          <CardTab icon="📤" label={t.outgoingRequests} />
          {data.outgoing.map((r) => (
            <div key={r.friendshipId} className="friend-row">
              <div className="friend-row-identity">
                <span className="avatar-sm">👤</span>
                <span>{r.displayName}</span>
              </div>
              <button className="btn-secondary" disabled={busyId === r.friendshipId} onClick={() => remove(r.friendshipId)}>
                {t.cancelRequest}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <CardTab icon="🤝" label={t.friendsCount(data.friends.length)} color="var(--good)" />
        {data.friends.length === 0 && <p>{t.noFriendsYet}</p>}
        {data.friends.map((f) => (
          <div key={f.friendshipId} className="friend-row">
            <div className="friend-row-identity">
              <span className="avatar-sm">👤</span>
              <span>{f.displayName}</span>
            </div>
            <div className="friend-row-actions">
              <button className="btn-primary" disabled={busyId === f.userId} onClick={() => battle(f.userId)}>
                {t.battle}
              </button>
              <Link href={`/friends/${f.friendshipId}`} className="btn-secondary">
                {t.chat}
              </Link>
              <button className="btn-secondary" disabled={busyId === f.friendshipId} onClick={() => remove(f.friendshipId)}>
                {t.remove}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
