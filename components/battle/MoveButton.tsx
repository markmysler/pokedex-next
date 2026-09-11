import type { Move, MoveKind } from "@/types/pokemon";
import { TYPE_COLORS } from "@/lib/typeData";
import { moveEffectText, moveTooltip } from "@/lib/pokemonDisplay";

interface MoveButtonProps {
  move: Move;
  disabled: boolean;
  // Per-battle remaining uses for this exact move (upgrades/43-uses-ui-and
  // -server-validation.md) -- null means unlimited (this instance's own
  // free weakest damage move, or a catalog-unlimited move). Replaces the
  // old insufficientMana boolean; the button is "can't be cast right now"
  // exactly when this is 0.
  usesLeft: number | null;
  onClick: () => void;
}

// Distinct from damage moves' own per-type color -- semantic tokens
// (upgrades/31-shared-ui-primitives.md, design/DESIGN_SYSTEM.md §6) rather
// than ad hoc hexes, so "what kind of move is this" reads through the same
// good/bad/info/warn vocabulary as everything else in the app: buff=good
// (a beneficial effect), debuff=bad (a harmful one), drain=info (fitting
// drain's life-steal theme; --info was the mana meter's hue pre-upgrades/
// 40-uses-based-move-data-model.md, kept for drain regardless),
// redirect=warn (matches FighterCard.tsx's status-badge.redirect, both
// being the same "confused" concept).
const KIND_ICON: Record<Exclude<MoveKind, "damage">, string> = {
  buff: "✨",
  debuff: "💢",
  drain: "🩸",
  redirect: "🌀",
};
const KIND_COLOR: Record<Exclude<MoveKind, "damage">, string> = {
  buff: "var(--good)",
  debuff: "var(--bad)",
  drain: "var(--info)",
  redirect: "var(--warn)",
};

export default function MoveButton({ move, disabled, usesLeft, onClick }: MoveButtonProps) {
  const icon = move.kind === "damage" ? "" : `${KIND_ICON[move.kind]} `;
  // Split into a name line (display font) and a meta line (mono) instead of
  // one combined string (upgrades/35-battle-shared-components-redesign.md's
  // "movebtn-style layout") -- same information as before, just laid out on
  // two lines rather than packed into a single label.
  const depleted = usesLeft === 0;
  // Live remaining/catalog-max fraction when limited, "unlimited uses" when
  // not -- fully replaces the old "${mana_cost} MP" text
  // (upgrades/40-uses-based-move-data-model.md's placeholder, superseded
  // here now that a real per-battle remaining count exists).
  const usesText = usesLeft === null ? "unlimited uses" : `${usesLeft}/${move.max_uses} uses`;
  const nameLine = depleted ? `⚠️ ${move.name}` : `${icon}${move.name}`;
  const metaLine = depleted ? usesText : `${moveEffectText(move)} · ${usesText}`;
  const background = disabled ? "gray" : move.kind === "damage" ? TYPE_COLORS[move.type] ?? "#68A090" : KIND_COLOR[move.kind];
  // Same reasoning as FighterCard.tsx's status badges: --good/--bad/--info/
  // --warn run bright in dark theme, so the button's default white label
  // (.move-btn's base color) would fail contrast there -- --accent-ink
  // already encodes the right dark/light flip for "text on a token fill."
  // Damage moves are unaffected (TYPE_COLORS isn't part of this contrast
  // fix, pre-existing behavior, out of scope here).
  const color = !disabled && move.kind !== "damage" ? "var(--accent-ink)" : undefined;

  return (
    <button
      className="move-btn"
      style={{ background, color }}
      disabled={disabled}
      onClick={onClick}
      title={moveTooltip(move)}
    >
      <span className="move-btn-name">{nameLine}</span>
      <span className="move-btn-meta">{metaLine}</span>
    </button>
  );
}
