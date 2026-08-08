import type { OwnedPokemon } from "@/types/pokemon";
import Sprite from "@/components/Sprite";
import TypeBadges from "@/components/TypeBadges";
import { isShinyInstance } from "@/lib/shiny";
import { displayName } from "@/lib/pokemonDisplay";

interface PokemonInstanceCardProps {
  pokemon: OwnedPokemon;
  variant: "grid" | "list";
  selected: boolean;
  onSelect: () => void;
  // Team-picker only (upgrades/09-team-picker-parity.md) -- 1-based pick
  // order, renders the ".team-picker-order" badge when provided. Undefined
  // everywhere else (Inventory), so that usage is unaffected.
  pickOrder?: number;
}

export default function PokemonInstanceCard({ pokemon, variant, selected, onSelect, pickOrder }: PokemonInstanceCardProps) {
  const shiny = isShinyInstance(pokemon);
  const name = displayName(pokemon);

  if (variant === "list") {
    const label = pokemon.nickname ? `${pokemon.nickname} (#${pokemon.number} ${pokemon.name})` : `#${pokemon.number}  ${pokemon.name}`;
    return (
      <div className={`pokemon-row${selected ? " selected" : ""}`} onClick={onSelect}>
        {`${label.padEnd(28)} Total ${pokemon.total}${pokemon.isStarter ? " ⭐" : ""}${shiny ? " ✨" : ""}`}
      </div>
    );
  }

  return (
    <div className={`pokemon-grid-card${selected ? " selected" : ""}`} onClick={onSelect}>
      {pickOrder !== undefined && <div className="team-picker-order">#{pickOrder}</div>}
      <Sprite name={pokemon.name} form={shiny ? "shiny" : "normal"} className="grid-card-sprite" />
      <div className="grid-card-name">{name}</div>
      {pokemon.nickname && <div className="grid-card-species">#{pokemon.number} {pokemon.name}</div>}
      <TypeBadges type1={pokemon.type1} type2={pokemon.type2} center small />
      {shiny && <span className="shiny-badge">✨ Shiny</span>}
      <div className="grid-card-total">Total {pokemon.total}{pokemon.isStarter ? " ⭐" : ""}</div>
    </div>
  );
}
