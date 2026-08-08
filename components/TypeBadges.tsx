import type { PokemonType } from "@/types/pokemon";
import { TYPE_COLORS } from "@/lib/typeData";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TypeBadgesProps {
  type1: PokemonType;
  type2: PokemonType | null;
  center?: boolean;
  small?: boolean;
}

export default function TypeBadges({ type1, type2, center, small }: TypeBadgesProps) {
  const types = [type1, type2].filter((t): t is PokemonType => Boolean(t));

  return (
    <div className={cn("flex gap-1.5", center && "justify-center")}>
      {types.map((t) => (
        <Badge
          key={t}
          className={cn("border-transparent font-bold text-white", small && "h-auto px-2 py-0.5 text-[10px]")}
          style={{ background: TYPE_COLORS[t] ?? "#68A090" }}
        >
          {t}
        </Badge>
      ))}
    </div>
  );
}
