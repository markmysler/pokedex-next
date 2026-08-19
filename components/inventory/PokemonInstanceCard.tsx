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
  // Trade-up mode (upgrades/14-pokemon-tradeup.md) and the friend trade
  // builder (upgrades/12-friend-chat-trading.md, starters excluded from
  // trading entirely per later request) -- renders dimmed and ignores
  // clicks, so starters are visibly *why* unavailable rather than looking
  // like a bug (they're just not in the filtered list).
  disabled?: boolean;
  // Shown as a native tooltip on the disabled card, explaining why -- same
  // "hover for the mechanic" convention as the battle status badges
  // (components/battle/FighterCard.tsx). No effect unless disabled.
  disabledReason?: string;
}

export default function PokemonInstanceCard({ pokemon, variant, selected, onSelect, pickOrder, disabled, disabledReason }: PokemonInstanceCardProps) {
  const shiny = isShinyInstance(pokemon);
  const name = displayName(pokemon);
  const handleClick = disabled ? undefined : onSelect;
  const title = disabled ? disabledReason : undefined;

  if (variant === "list") {
    const label = pokemon.nickname ? `${pokemon.nickname} (#${pokemon.number} ${pokemon.name})` : `#${pokemon.number}  ${pokemon.name}`;
    return (
      <div className={`pokemon-row${selected ? " selected" : ""}${disabled ? " disabled" : ""}`} onClick={handleClick} title={title}>
        {`${label.padEnd(28)} Total ${pokemon.total}${pokemon.isStarter ? " ⭐" : ""}${shiny ? " ✨" : ""}`}
      </div>
    );
  }

  return (
    <div className={`pokemon-grid-card${selected ? " selected" : ""}${disabled ? " disabled" : ""}`} onClick={handleClick} title={title}>
      {pickOrder !== undefined && <div className="team-picker-order">#{pickOrder}</div>}
      <Sprite name={pokemon.name} form={shiny ? "shiny" : "normal"} className="grid-card-sprite" />
      <div className="grid-card-name">{name}</div>
      {pokemon.nickname && <div className="grid-card-species">#{pokemon.number} {pokemon.name}</div>}
      <TypeBadges type1={pokemon.type1} type2={pokemon.type2} center small />
      {(pokemon.isStarter || shiny) && (
        <div className="grid-card-badges">
          {pokemon.isStarter && <span className="starter-badge">⭐ Starter</span>}
          {shiny && <span className="shiny-badge">✨ Shiny</span>}
        </div>
      )}
      <div className="grid-card-total">Total {pokemon.total}</div>
    </div>
  );
}
