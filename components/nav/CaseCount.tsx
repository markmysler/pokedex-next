"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface CaseCountValue {
  count: number;
  // Pages that change the number of unopened lootboxes (opening, trade up,
  // winning a battle) report it here so the top bar's case counter stays
  // right without a server round trip. The layout doesn't re-render on
  // client navigation, so its own count would otherwise go stale.
  setCount: (next: number | ((prev: number) => number)) => void;
}

const CaseCountContext = createContext<CaseCountValue | null>(null);

export function CaseCountProvider({ initialCount, children }: { initialCount: number; children: ReactNode }) {
  const [count, setCountState] = useState(initialCount);
  // Re-sync when the server-rendered count changes (e.g. after a
  // router.refresh()), the "adjust state when a prop changes" pattern.
  const [seenInitial, setSeenInitial] = useState(initialCount);
  if (initialCount !== seenInitial) {
    setSeenInitial(initialCount);
    setCountState(initialCount);
  }

  const setCount = useCallback((next: number | ((prev: number) => number)) => {
    setCountState((prev) => Math.max(0, typeof next === "function" ? next(prev) : next));
  }, []);

  return <CaseCountContext.Provider value={{ count, setCount }}>{children}</CaseCountContext.Provider>;
}

export function useCaseCount(): CaseCountValue {
  const ctx = useContext(CaseCountContext);
  if (!ctx) throw new Error("useCaseCount must be used within a CaseCountProvider");
  return ctx;
}
