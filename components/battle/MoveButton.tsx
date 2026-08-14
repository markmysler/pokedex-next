import type { Move, MoveKind } from "@/types/pokemon";
import { TYPE_COLORS } from "@/lib/typeData";
import { moveEffectText, moveTooltip } from "@/lib/pokemonDisplay";

interface MoveButtonProps {
  move: Move;
  disabled: boolean;
  insufficientMana: boolean;
  onClick: () => void;
}

// Distinct from damage moves' own per-type color (upgrades/28-move-ui-and
// -ally-targeting.md) -- reuses the same hues FighterCard.tsx's status
// badges already established for the same concepts (buff=green like a
// heal, debuff=bleed-red like a bad status, drain=poison-purple for the
// vampiric theme, redirect=blind's brown/yellow for the confusion theme).
const KIND_ICON: Record<Exclude<MoveKind, "damage">, string> = {
  buff: "✨",
  debuff: "💢",
  drain: "🩸",
  redirect: "🌀",
};
const KIND_COLOR: Record<Exclude<MoveKind, "damage">, string> = {
  buff: "#2FA572",
  debuff: "#C0392B",
  drain: "#7D3C98",
  redirect: "#7D6608",
};

export default function MoveButton({ move, disabled, insufficientMana, onClick }: MoveButtonProps) {
  const icon = move.kind === "damage" ? "" : `${KIND_ICON[move.kind]} `;
  const label = insufficientMana
    ? `⚠️ ${move.name} (${move.mana_cost} MP)`
    : `${icon}${move.name} (${moveEffectText(move)} | ${move.mana_cost} MP)`;
  const background = disabled ? "gray" : move.kind === "damage" ? TYPE_COLORS[move.type] ?? "#68A090" : KIND_COLOR[move.kind];

  return (
    <button
      className="move-btn"
      style={{ background }}
      disabled={disabled}
      onClick={onClick}
      title={moveTooltip(move)}
    >
      {label}
    </button>
  );
}
