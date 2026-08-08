import type { Move } from "@/types/pokemon";
import { TYPE_COLORS } from "@/lib/typeData";
import { Button } from "@/components/ui/button";

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
    <Button
      type="button"
      className="h-auto min-w-0 border-none px-1 py-1.5 text-[11px] font-bold whitespace-normal text-white hover:opacity-90 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
      style={{ background: disabled ? undefined : (TYPE_COLORS[move.type] ?? "#68A090") }}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}
