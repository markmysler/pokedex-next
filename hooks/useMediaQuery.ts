"use client";

import { useSyncExternalStore } from "react";

// Whether a CSS media query matches, kept in sync as the window changes.
// The server snapshot is `false`, so the first client render after
// hydration may flip it; callers only use it to choose between a side
// panel and a dialog, which is fine to switch after load.
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}
