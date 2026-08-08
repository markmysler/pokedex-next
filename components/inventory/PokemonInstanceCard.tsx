import type { OwnedPokemon } from "@/types/pokemon";
import Sprite from "@/components/Sprite";
import TypeBadges from "@/components/TypeBadges";
import { isShinyInstance } from "@/lib/shiny";

interface PokemonInstanceCardProps {
  pokemon: OwnedPokemon;
  variant: "grid" | "list";
  selected: boolean;
  onSelect: () => void;
}

export default function PokemonInstanceCard({ pokemon, variant, selected, onSelect }: PokemonInstanceCardProps) {
  const shiny = isShinyInstance(pokemon);

  if (variant === "list") {
    return (
      <div className={`pokemon-row${selected ? " selected" : ""}`} onClick={onSelect}>
        {`#${pokemon.number}  ${pokemon.name.padEnd(15)} Total ${pokemon.total}${pokemon.isStarter ? " ⭐" : ""}${shiny ? " ✨" : ""}`}
      </div>
    );
  }

  return (
    <div className={`pokemon-grid-card${selected ? " selected" : ""}`} onClick={onSelect}>
      <Sprite name={pokemon.name} form={shiny ? "shiny" : "normal"} className="grid-card-sprite" />
      <div className="grid-card-name">#{pokemon.number} {pokemon.name}</div>
      <TypeBadges type1={pokemon.type1} type2={pokemon.type2} center small />
      {shiny && <span className="shiny-badge">✨ Shiny</span>}
      <div className="grid-card-total">Total {pokemon.total}{pokemon.isStarter ? " ⭐" : ""}</div>
    </div>
  );
}
