// Segmented, Game Boy-style meter (upgrades/31-shared-ui-primitives.md) --
// replaces the old smooth-gradient .progress-fill/.stat-bar-fill pattern
// for anything that reads like a device readout: HP/MP, base stats, the
// lootbox reveal's staggered stat bars. Not wired into any consumer yet --
// FighterCard/PokemonDetail/InventoryPageClient/LootboxRevealDialog pick
// this up in later steps of this wave.
interface SegmentedMeterProps {
  label: string;
  value: number;
  max: number;
  color: string;
  segments?: number;
  // Lootbox reveal's staggered animation (upgrades/04-lootbox-opening.md)
  // needs an "not shown yet" state distinct from "shown at 0" -- when
  // false, every segment renders unlit and the numeric readout is blank,
  // same shape LootboxRevealDialog's current per-stat reveal already uses.
  revealed?: boolean;
  // Bench-member size (upgrades/35-battle-shared-components-redesign.md) --
  // same markup, smaller grid/type via .meter.compact in globals.css.
  compact?: boolean;
}

export default function SegmentedMeter({ label, value, max, color, segments = 10, revealed = true, compact = false }: SegmentedMeterProps) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const litCount = revealed ? Math.round(pct * segments) : 0;

  // <span>, not <div> -- FighterCard.tsx's compact bench meter (upgrades/35-
  // battle-shared-components-redesign.md) renders this inside a <button>,
  // and a <div> isn't valid phrasing content there (same reasoning as
  // FighterCard.tsx's own StatusBadges). Display is driven entirely by CSS
  // (.meter is display:grid, .segbar is display:flex), so the tag change is
  // purely for HTML validity, not layout.
  return (
    <span className={compact ? "meter compact" : "meter"}>
      <span className="m-label">{label}</span>
      <span className="segbar" style={{ "--seg-color": color } as React.CSSProperties}>
        {Array.from({ length: segments }, (_, i) => (
          <span key={i} className={i < litCount ? "on" : undefined} />
        ))}
      </span>
      <span className="m-value">{revealed ? `${Math.max(0, Math.round(value))}/${max}` : ""}</span>
    </span>
  );
}
