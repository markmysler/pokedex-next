import type { PokemonType } from "@/types/pokemon";
import { TYPE_COLORS } from "@/lib/typeData";

interface TypeBadgesProps {
  type1: PokemonType;
  type2: PokemonType | null;
  center?: boolean;
  small?: boolean;
}

export default function TypeBadges({ type1, type2, center, small }: TypeBadgesProps) {
  const types = [type1, type2].filter((t): t is PokemonType => Boolean(t));

  return (
    <div className={`badge-frame${center ? " center" : ""}`}>
      {types.map((t) => (
        <span
          key={t}
          className="type-badge"
          style={{
            background: TYPE_COLORS[t] ?? "#68A090",
            fontSize: small ? 10 : undefined,
            padding: small ? "3px 8px" : undefined,
          }}
        >
          {t}
        </span>
      ))}
    </div>
  );
}
