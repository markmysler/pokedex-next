"use client";

import { useEffect } from "react";

// Fires once, fire-and-forget, when the Notifications page loads
// (upgrades/17-persistent-notifications.md) -- opening the page is itself
// "you've now seen these," so there's no per-item "mark read" control to
// wire up. Renders nothing.
export default function MarkAllReadOnMount() {
  useEffect(() => {
    fetch("/api/notifications/read-all", { method: "POST" });
  }, []);

  return null;
}
