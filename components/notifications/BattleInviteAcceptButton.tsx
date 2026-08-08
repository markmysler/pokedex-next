"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface BattleInviteAcceptButtonProps {
  roomCode: string;
}

// Same accept() logic as FriendNotifications.tsx's BattleInviteToast --
// this is the Notifications-page equivalent for an invite that already
// survived a refresh (upgrades/17-persistent-notifications.md). The
// server already confirmed the room is still joinable before rendering
// this button (see getNotificationsForUser's battleInviteJoinable), but a
// concurrent join between that check and this click is still possible --
// surfaced here as an inline error, same as the toast does.
export default function BattleInviteAcceptButton({ roomCode }: BattleInviteAcceptButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function accept() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/rooms/${roomCode}/join`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (data.error) {
      setError(data.error);
      return;
    }
    router.push(`/online?code=${roomCode}`);
  }

  return (
    <div className="notification-action">
      <button className="btn-primary" onClick={accept} disabled={busy}>
        {busy ? "Joining…" : "Accept"}
      </button>
      {error && <p className="auth-error">{error}</p>}
    </div>
  );
}
