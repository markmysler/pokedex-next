"use client";

import type { OwnedPokemon } from "@/types/pokemon";
import Sprite from "@/components/Sprite";
import TypeBadges from "@/components/TypeBadges";
import Icon from "@/components/ui/Icon";
import { isShinyInstance } from "@/lib/shiny";
import { instanceRarity } from "@/lib/rarity";
import { displayName } from "@/lib/pokemonDisplay";
import { useDictionary } from "@/lib/i18n/useDictionary";

interface PokemonInstanceCardProps {
  pokemon: OwnedPokemon;
  variant: "grid" | "list";
  selected: boolean;
  onSelect: () => void;
  // Team picker only: 1-based pick order, shown as a numbered badge.
  pickOrder?: number;
  // Multi-select contexts (collection selection, trade builder): shows a
  // checkbox so "selected" reads as "ticked" rather than "being viewed".
  selectable?: boolean;
  // Smaller sprite and type, for dense pickers (trade builder).
  compact?: boolean;
  // Dimmed and inert, with the reason as a tooltip and accessible
  // description -- starters in trade-up/trading, wrong species in evolve.
  disabled?: boolean;
  disabledReason?: string;
}

// The collection atom (redesign wave v9): a button whose bottom band and
// glow are the instance's rarity grade (lib/rarity.ts), so a strong pull
// stands out in any grid without opening it.
export default function PokemonInstanceCard({
  pokemon,
  variant,
  selected,
  onSelect,
  pickOrder,
  selectable,
  compact,
  disabled,
  disabledReason,
}: PokemonInstanceCardProps) {
  const dict = useDictionary();
  const shiny = isShinyInstance(pokemon);
  const rarity = instanceRarity(pokemon);
  const name = displayName(pokemon);
  const title = disabled ? disabledReason : undefined;
  const flags = (
    <>
      {shiny && <Icon name="star" size={14} label={dict.common.shinyBadge} />}
      {pokemon.isStarter && <Icon name="heart" size={14} className="starter" label={dict.common.starterBadge} />}
    </>
  );

  if (variant === "list") {
    return (
      <button
        type="button"
        className={`prow rarity-${rarity}${disabled ? " is-disabled" : ""}`}
        aria-pressed={selected}
        aria-disabled={disabled || undefined}
        onClick={disabled ? undefined : onSelect}
        title={title}
      >
        <span className="prow-band" />
        <Sprite name={pokemon.name} form={shiny ? "shiny" : "normal"} className="" />
        <span className="prow-name">
          {name}
          <span className="faint mono">#{pokemon.number}{pokemon.nickname ? ` ${pokemon.name}` : ""}</span>
        </span>
        <span className="row" style={{ color: "var(--r-shiny)", gap: 4 }}>{flags}</span>
        <span className="pcard-total">{pokemon.total}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`pcard rarity-${rarity}${compact ? " pcard-compact" : ""}${disabled ? " is-disabled" : ""}`}
      aria-pressed={selected}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onSelect}
      title={title}
    >
      {pickOrder !== undefined ? (
        <span className="pcard-order">{pickOrder}</span>
      ) : (
        selectable && (
          <span className="pcard-check" aria-hidden="true">
            {selected && <Icon name="check" size={14} strokeWidth={3} />}
          </span>
        )
      )}
      <span className="pcard-flags">{flags}</span>
      <Sprite name={pokemon.name} form={shiny ? "shiny" : "normal"} className="pcard-sprite" />
      <span className="pcard-name">{name}</span>
      {pokemon.nickname && <span className="pcard-sub">#{pokemon.number} {pokemon.name}</span>}
      {!compact && <TypeBadges type1={pokemon.type1} type2={pokemon.type2} center small />}
      <span className="pcard-total">{dict.collection.totalLabel(pokemon.total)}</span>
    </button>
  );
}
