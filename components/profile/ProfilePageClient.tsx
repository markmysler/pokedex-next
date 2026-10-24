"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CopyCode from "@/components/ui/CopyCode";
import Icon from "@/components/ui/Icon";
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

  const initials = (displayName || dict.trainerFallback).trim().slice(0, 2).toUpperCase();

  return (
    <div className="page page-narrow">
      <div className="profile-hero">
        <span className="avatar avatar-lg">{initials}</span>
        <div style={{ minWidth: 0 }}>
          <h1>{displayName || dict.trainerFallback}</h1>
          <span className="muted small">{email}</span>
        </div>
      </div>

      <form className="panel stack" onSubmit={handleSave} style={{ gap: 16 }}>
        <h2 style={{ fontSize: 16 }}>{dict.accountTitle}</h2>
        <label className="field">
          <span>{dict.displayName}</span>
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
        <label className="field">
          <span>{dict.email}</span>
          <input value={email} disabled />
          <span className="small faint" style={{ fontWeight: 400 }}>{dict.emailNote}</span>
        </label>
        {error && <p className="alert alert-error" role="alert">{error}</p>}
        <div className="row">
          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? dict.saving : dict.save}
          </button>
          {saved && (
            <span className="small" style={{ color: "var(--good)" }} role="status">
              <Icon name="check" size={14} /> {dict.saved}
            </span>
          )}
        </div>
      </form>

      <section className="panel stack">
        <h2 style={{ fontSize: 16 }}>{dict.friendCode}</h2>
        <CopyCode code={friendCode} copyLabel={dict.copy} copiedLabel={dict.copied} />
        <p className="small muted">{dict.friendCodeNote}</p>
      </section>
    </div>
  );
}
