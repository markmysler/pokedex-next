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
}

export default function SegmentedMeter({ label, value, max, color, segments = 10, revealed = true }: SegmentedMeterProps) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const litCount = revealed ? Math.round(pct * segments) : 0;

  return (
    <div className="meter">
      <span className="m-label">{label}</span>
      <div className="segbar" style={{ "--seg-color": color } as React.CSSProperties}>
        {Array.from({ length: segments }, (_, i) => (
          <span key={i} className={i < litCount ? "on" : undefined} />
        ))}
      </div>
      <span className="m-value">{revealed ? `${Math.max(0, Math.round(value))}/${max}` : ""}</span>
    </div>
  );
}
