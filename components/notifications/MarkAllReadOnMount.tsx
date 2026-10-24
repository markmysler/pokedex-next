"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Fires once, fire-and-forget, when the Notifications page loads
// (upgrades/17-persistent-notifications.md) -- opening the page is itself
// "you've now seen these," so there's no per-item "mark read" control to
// wire up. Renders nothing.
export default function MarkAllReadOnMount() {
  const router = useRouter();
  useEffect(() => {
    // Refresh afterwards so the layout re-reads the unread count and the
    // top bar's bell badge clears (redesign wave v9).
    fetch("/api/notifications/read-all", { method: "POST" }).then(() => router.refresh());
  }, [router]);

  return null;
}
