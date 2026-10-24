"use client";

import type { Move, MoveKind } from "@/types/pokemon";
import { TYPE_COLORS } from "@/lib/typeData";
import { moveEffectText, moveTooltip } from "@/lib/pokemonDisplay";
import { useDictionary } from "@/lib/i18n/useDictionary";
import Icon, { type IconName } from "@/components/ui/Icon";

interface MoveButtonProps {
  move: Move;
  disabled: boolean;
  usesLeft: number | null;
  onClick: () => void;
}

// Non-damage moves get an icon and a semantic stripe instead of their type
// colour, so "what element" and "what kind of move" never compete for the
// same hue (design/DESIGN_SYSTEM.md).
const KIND_ICON: Record<Exclude<MoveKind, "damage">, IconName> = {
  buff: "sparkle",
  debuff: "alert",
  drain: "heart",
  redirect: "refresh",
};
const KIND_COLOR: Record<Exclude<MoveKind, "damage">, string> = {
  buff: "var(--good)",
  debuff: "var(--bad)",
  drain: "var(--info)",
  redirect: "var(--warn)",
};
const MAX_PIPS = 8;

// One of the four big move buttons in the action dock (redesign wave v9):
// name and type up top, effect and remaining uses (as pips) underneath.
export default function MoveButton({ move, disabled, usesLeft, onClick }: MoveButtonProps) {
  const dict = useDictionary();
  const stripe = move.kind === "damage" ? TYPE_COLORS[move.type] ?? "#68A090" : KIND_COLOR[move.kind];
  const max = move.max_uses ?? usesLeft;
  const usesLabel = usesLeft === null ? dict.battle.moveTooltip.unlimitedUses : dict.battle.moveEffect.usesFraction(usesLeft, max ?? usesLeft);

  return (
    <button
      type="button"
      className={`move-btn${usesLeft === 0 ? " is-depleted" : ""}`}
      style={{ "--stripe": stripe } as React.CSSProperties}
      disabled={disabled}
      onClick={onClick}
      title={moveTooltip(move, dict)}
    >
      <span className="move-btn-top">
        <span className="move-btn-name">
          {move.kind !== "damage" && <Icon name={KIND_ICON[move.kind]} size={15} />}
          {move.name}
        </span>
        <span className="type-chip" style={{ background: TYPE_COLORS[move.type] ?? "#68A090" }}>{move.type}</span>
      </span>
      <span className="move-btn-meta">
        <span>{moveEffectText(move, dict)}</span>
        {usesLeft === null || max === null || max > MAX_PIPS ? (
          <span className="mono" aria-label={usesLabel}>{usesLeft === null ? "∞" : `${usesLeft}/${max}`}</span>
        ) : (
          <span className="uses-pips" role="img" aria-label={usesLabel}>
            {Array.from({ length: max }, (_, i) => <span key={i} className={i < usesLeft ? "on" : undefined} />)}
          </span>
        )}
      </span>
    </button>
  );
}
