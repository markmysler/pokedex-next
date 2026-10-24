"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";

// A short code (friend code) in big mono type with a copy button. If the
// clipboard isn't available the code is still on screen to copy by hand.
export default function CopyCode({ code, copyLabel, copiedLabel }: { code: string; copyLabel: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (permissions, insecure context).
    }
  }

  return (
    <div className="copy-code">
      <span className="copy-code-value">{code}</span>
      <button type="button" className="btn-secondary btn-sm" onClick={copy}>
        <Icon name={copied ? "check" : "copy"} size={14} /> {copied ? copiedLabel : copyLabel}
      </button>
    </div>
  );
}
