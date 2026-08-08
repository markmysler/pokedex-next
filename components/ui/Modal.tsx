"use client";

import type { ReactNode } from "react";

interface ModalProps {
  onClose: () => void;
  large?: boolean;
  children: ReactNode;
}

// Small fixed-overlay + centered .card panel — the shared building block
// for any dialog in this app (see upgrades/main.md's "Modals and toasts are
// small custom components" decision). No focus-trap library: same
// position: fixed pattern SideNav.tsx's mobile nav-overlay already uses.
export default function Modal({ onClose, large, children }: ModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`card modal-panel${large ? " modal-panel-large" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        {children}
      </div>
    </div>
  );
}
