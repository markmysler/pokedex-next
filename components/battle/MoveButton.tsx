import type { Move, MoveKind } from "@/types/pokemon";
import { TYPE_COLORS } from "@/lib/typeData";
import { moveEffectText, moveTooltip } from "@/lib/pokemonDisplay";

interface MoveButtonProps {
  move: Move;
  disabled: boolean;
  insufficientMana: boolean;
  onClick: () => void;
}

// Distinct from damage moves' own per-type color -- semantic tokens
// (upgrades/31-shared-ui-primitives.md, design/DESIGN_SYSTEM.md §6) rather
// than ad hoc hexes, so "what kind of move is this" reads through the same
// good/bad/info/warn vocabulary as everything else in the app: buff=good
// (a beneficial effect), debuff=bad (a harmful one), drain=info (the same
// hue MP/mana already uses, fitting drain's life/mana-steal theme),
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

export default function MoveButton({ move, disabled, insufficientMana, onClick }: MoveButtonProps) {
  const icon = move.kind === "damage" ? "" : `${KIND_ICON[move.kind]} `;
  const label = insufficientMana
    ? `⚠️ ${move.name} (${move.mana_cost} MP)`
    : `${icon}${move.name} (${moveEffectText(move)} | ${move.mana_cost} MP)`;
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
      {label}
    </button>
  );
}
