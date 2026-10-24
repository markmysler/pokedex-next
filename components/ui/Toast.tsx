"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { useDictionary } from "@/lib/i18n/useDictionary";
import Icon from "@/components/ui/Icon";

interface ToastEntry {
  id: number;
  content: ReactNode;
}

interface ToastContextValue {
  push: (content: ReactNode, durationMs?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 8000;

// A small bottom-corner stack, auto-dismissing (see upgrades/main.md's
// "Modals and toasts are small custom components" decision) -- a plain
// fixed-position stack, not a UI-kit import. Announced politely to screen
// readers via the stack's live region.
export function ToastProvider({ children }: { children: ReactNode }) {
  const dict = useDictionary();
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (content: ReactNode, durationMs = DEFAULT_DURATION_MS) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, content }]);
      setTimeout(() => dismiss(id), durationMs);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.content}
            <button type="button" className="icon-btn icon-btn-plain toast-close" onClick={() => dismiss(t.id)} aria-label={dict.common.dismiss}>
              <Icon name="close" size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
