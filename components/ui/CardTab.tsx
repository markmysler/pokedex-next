// The "bezel tab" card header (upgrades/31-shared-ui-primitives.md) -- a
// small icon-chip + mono eyebrow label overlapping a .card's top edge,
// replacing the inline-emoji <h3>Label</h3> convention used throughout the
// app today. Not wired into any consumer yet -- later steps in this wave
// swap each card's heading over to this as they touch that page.
interface CardTabProps {
  icon: string;
  label: string;
  // Chip background; defaults to the accent so callers don't need to know
  // the token name for the common case. Pass a semantic token (e.g.
  // "var(--good)") for cards that aren't just "generic accent-branded".
  color?: string;
}

export default function CardTab({ icon, label, color }: CardTabProps) {
  return (
    <div className="card-tab">
      <span className="card-tab-chip" style={color ? { background: color } : undefined}>
        {icon}
      </span>
      {label}
    </div>
  );
}
