import type { PokemonType } from "@/types/pokemon";
import { TYPE_COLORS } from "@/lib/typeData";

interface TypeBadgesProps {
  type1: PokemonType;
  type2: PokemonType | null;
  center?: boolean;
  small?: boolean;
}

// Type colours only ever appear here, as categorical data -- never as a
// panel or button colour (design/DESIGN_SYSTEM.md). A <span> root so the
// chips can sit inside a <button> (Pokémon cards are buttons).
export default function TypeBadges({ type1, type2, center, small }: TypeBadgesProps) {
  const types = [type1, type2].filter((t): t is PokemonType => Boolean(t));

  return (
    <span className={`type-chips${center ? " center" : ""}${small ? " small" : ""}`}>
      {types.map((t) => (
        <span key={t} className="type-chip" style={{ background: TYPE_COLORS[t] ?? "#68A090" }}>
          {t}
        </span>
      ))}
    </span>
  );
}
