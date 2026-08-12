import type { Move } from "@/types/pokemon";
import { TYPE_COLORS } from "@/lib/typeData";
import { movePower } from "@/lib/pokemonDisplay";

interface MoveButtonProps {
  move: Move;
  disabled: boolean;
  insufficientMana: boolean;
  onClick: () => void;
}

export default function MoveButton({ move, disabled, insufficientMana, onClick }: MoveButtonProps) {
  const power = movePower(move);
  const label = insufficientMana
    ? `⚠️ ${move.name} (${move.mana_cost} MP)`
    : `${move.name} (${power !== null ? `${power} Pwr | ` : ""}${move.mana_cost} MP)`;

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
