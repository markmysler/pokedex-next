"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CardTab from "@/components/ui/CardTab";
import type { Dictionary } from "@/lib/i18n/getDictionary";

interface ProfilePageClientProps {
  email: string;
  initialDisplayName: string;
  friendCode: string;
  dict: Dictionary["account"]["profile"];
}

export default function ProfilePageClient({ email, initialDisplayName, friendCode, dict }: ProfilePageClientProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName }),
    });
    const data = await res.json();

    setSaving(false);
    if (data.error) {
      setError(data.error);
      return;
    }
    setSaved(true);
    // Re-runs Server Components, including the layout's SideNav, so the new
    // display name shows up there immediately instead of after a hard reload.
    router.refresh();
  }

  return (
    <div className="page">
      <h1 className="page-title">{dict.heading}</h1>

      <div className="card profile-card">
        <div className="profile-header">
          <div className="avatar-lg">👤</div>
          <div>
            <div className="profile-header-name">{displayName || dict.trainerFallback}</div>
            <div className="profile-header-email">{email}</div>
          </div>
        </div>
        <form className="auth-form profile-form" onSubmit={handleSave}>
          <label>
            {dict.email}
            <input value={email} disabled />
          </label>
          <label>
            {dict.displayName}
            <input
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setSaved(false);
              }}
              minLength={2}
              maxLength={30}
              required
            />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? dict.saving : dict.save}
          </button>
          {saved && <p className="notes-status">{dict.saved}</p>}
        </form>
      </div>

      <div className="card profile-card">
        <CardTab icon="🔑" label={dict.friendCode} />
        <p className="friend-code-display">{friendCode}</p>
        <p className="online-status">{dict.friendCodeNote}</p>
      </div>
    </div>
  );
}
