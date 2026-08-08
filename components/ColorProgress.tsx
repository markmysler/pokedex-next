"use client";

import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import { ProgressTrack, ProgressIndicator } from "@/components/ui/progress";

interface ColorProgressProps {
  value: number; // 0-100
  color?: string;
  className?: string;
  trackClassName?: string;
}

// shadcn's default <Progress> hard-codes a bg-primary indicator, which
// doesn't work for HP/MP/stat bars that each need their own color (see
// upgrades/01-design-system.md — content-driven colors like these stay as
// style overrides on top of the shadcn primitives, not part of the theme).
// Composes the same base-ui Progress primitives shadcn's own component
// uses, just with the indicator's color left open.
export default function ColorProgress({ value, color, className, trackClassName }: ColorProgressProps) {
  return (
    <ProgressPrimitive.Root value={Math.max(0, Math.min(100, value))} className={className}>
      <ProgressTrack className={trackClassName}>
        <ProgressIndicator style={color ? { background: color } : undefined} />
      </ProgressTrack>
    </ProgressPrimitive.Root>
  );
}
