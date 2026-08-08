"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">👤 Profile</h1>
      <Card className="max-w-sm">
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSave}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="profile-email">Email</Label>
              <Input id="profile-email" value={email} disabled />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="profile-display-name">Display name</Label>
              <Input
                id="profile-display-name"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setSaved(false);
                }}
                minLength={2}
                maxLength={30}
                required
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            {saved && <p className="text-xs text-muted-foreground">Saved ✓</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
