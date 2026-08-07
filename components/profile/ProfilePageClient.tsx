"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProfilePageClientProps {
  email: string;
  initialDisplayName: string;
}

export default function ProfilePageClient({ email, initialDisplayName }: ProfilePageClientProps) {
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
      <h1 className="page-title">👤 Profile</h1>
      <form className="card auth-form" onSubmit={handleSave}>
        <label>
          Email
          <input value={email} disabled />
        </label>
        <label>
          Display name
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
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && <p className="notes-status">Saved ✓</p>}
      </form>
    </div>
  );
}
