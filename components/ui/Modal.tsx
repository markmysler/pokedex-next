"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useDictionary } from "@/lib/i18n/useDictionary";
import Icon from "@/components/ui/Icon";

interface ModalProps {
  onClose: () => void;
  // Kept for existing callers; same as size="lg".
  large?: boolean;
  size?: "md" | "lg" | "xl";
  // Hides the corner close button, for dialogs that must be answered
  // through their own buttons. Escape and backdrop clicks still call
  // onClose, which a caller can ignore while it's busy.
  hideClose?: boolean;
  className?: string;
  children: ReactNode;
}

// The app's one dialog primitive (redesign wave v9): a native <dialog>
// opened with showModal(), so focus trapping, Escape and the top layer come
// from the browser instead of hand-rolled code. Mounting opens it,
// unmounting closes it -- callers keep rendering it conditionally, exactly
// as they did with the old overlay version.
export default function Modal({ onClose, large, size, hideClose, className, children }: ModalProps) {
  const dict = useDictionary();
  const ref = useRef<HTMLDialogElement>(null);
  const resolvedSize = size ?? (large ? "lg" : "md");

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className={`dialog${resolvedSize === "md" ? "" : ` dialog-${resolvedSize}`}${className ? ` ${className}` : ""}`}
      onCancel={(e) => {
        // Escape: let the caller decide (it may be mid-request).
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // A click on the dialog element itself (not its contents) is a
        // click on the backdrop.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-body">
        {!hideClose && (
          <button type="button" className="icon-btn icon-btn-plain dialog-close" onClick={onClose} aria-label={dict.common.close}>
            <Icon name="close" />
          </button>
        )}
        {children}
      </div>
    </dialog>
  );
}
