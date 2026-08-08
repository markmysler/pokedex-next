"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { FriendsData } from "@/lib/friends";

interface FriendsPageClientProps {
  myFriendCode: string;
  initial: FriendsData;
}

export default function FriendsPageClient({ myFriendCode, initial }: FriendsPageClientProps) {
  const router = useRouter();
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
    if (!code) return setStatus("⚠️ Enter a friend code first.");
    const res = await fetch("/api/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendCode: code }),
    });
    const result = await res.json();
    if (result.error) return setStatus(`⚠️ ${result.error}`);
    setCodeInput("");
    setStatus(result.status === "accepted" ? "✅ You're now friends!" : "Friend request sent!");
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
      return setStatus(`⚠️ ${room.error}`);
    }
    const inviteRes = await fetch("/api/friends/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendUserId, roomCode: room.roomCode }),
    });
    const invite = await inviteRes.json();
    setBusyId(null);
    if (invite.error) return setStatus(`⚠️ ${invite.error}`);
    router.push(`/online?code=${room.roomCode}&host=1`);
  }

  return (
    <>
      <div className="card">
        <h3>🔑 Your Friend Code</h3>
        <p className="friend-code-display">{myFriendCode}</p>
        <p className="online-status">Share this code with a friend so they can add you.</p>
      </div>

      <div className="card">
        <h3>➕ Add a Friend</h3>
        <div className="online-join-row">
          <input
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            maxLength={6}
            placeholder="Enter friend code"
          />
          <button className="btn-primary" onClick={sendRequest}>Send Request</button>
        </div>
        {status && <div className="online-status">{status}</div>}
      </div>

      {data.incoming.length > 0 && (
        <div className="card">
          <h3>📥 Incoming Requests</h3>
          {data.incoming.map((r) => (
            <div key={r.friendshipId} className="friend-row">
              <span>{r.displayName}</span>
              <div className="friend-row-actions">
                <button className="btn-primary" disabled={busyId === r.friendshipId} onClick={() => respond(r.friendshipId, true)}>
                  Accept
                </button>
                <button className="btn-secondary" disabled={busyId === r.friendshipId} onClick={() => respond(r.friendshipId, false)}>
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {data.outgoing.length > 0 && (
        <div className="card">
          <h3>📤 Outgoing Requests</h3>
          {data.outgoing.map((r) => (
            <div key={r.friendshipId} className="friend-row">
              <span>{r.displayName}</span>
              <button className="btn-secondary" disabled={busyId === r.friendshipId} onClick={() => remove(r.friendshipId)}>
                Cancel
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h3>🤝 Friends ({data.friends.length})</h3>
        {data.friends.length === 0 && <p>No friends yet — send a request above to get started.</p>}
        {data.friends.map((f) => (
          <div key={f.friendshipId} className="friend-row">
            <span>{f.displayName}</span>
            <div className="friend-row-actions">
              <button className="btn-primary" disabled={busyId === f.userId} onClick={() => battle(f.userId)}>
                ⚔️ Battle
              </button>
              <Link href={`/friends/${f.friendshipId}`} className="btn-secondary">
                💬 Chat
              </Link>
              <button className="btn-secondary" disabled={busyId === f.friendshipId} onClick={() => remove(f.friendshipId)}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
