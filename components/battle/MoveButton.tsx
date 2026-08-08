import type { Move } from "@/types/pokemon";
import { TYPE_COLORS } from "@/lib/typeData";

interface MoveButtonProps {
  move: Move;
  disabled: boolean;
  insufficientMana: boolean;
  onClick: () => void;
}

export default function MoveButton({ move, disabled, insufficientMana, onClick }: MoveButtonProps) {
  const label = insufficientMana
    ? `⚠️ ${move.name} (${move.mana_cost} MP)`
    : `${move.name} (${move.power} Pwr | ${move.mana_cost} MP)`;

  return (
    <button
      className="move-btn"
      style={{ background: disabled ? "gray" : TYPE_COLORS[move.type] ?? "#68A090" }}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
