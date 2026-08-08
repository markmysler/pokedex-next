import type { OwnedPokemon } from "@/types/pokemon";
import Sprite from "@/components/Sprite";
import TypeBadges from "@/components/TypeBadges";
import { cn } from "@/lib/utils";

interface PokemonInstanceCardProps {
  pokemon: OwnedPokemon;
  variant: "grid" | "list";
  selected: boolean;
  onSelect: () => void;
}

export default function PokemonInstanceCard({ pokemon, variant, selected, onSelect }: PokemonInstanceCardProps) {
  if (variant === "list") {
    return (
      <div
        className={cn(
          "cursor-pointer rounded-md px-2.5 py-1.5 font-mono text-sm whitespace-pre hover:bg-accent",
          selected && "bg-primary text-primary-foreground hover:bg-primary"
        )}
        onClick={onSelect}
      >
        {`#${pokemon.number}  ${pokemon.name.padEnd(15)} Total ${pokemon.total}${pokemon.isStarter ? " ⭐" : ""}`}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-border p-2 text-center",
        selected ? "bg-primary text-primary-foreground" : "hover:border-primary"
      )}
      onClick={onSelect}
    >
      <Sprite name={pokemon.name} form="normal" className="size-16 object-contain" />
      <div className="text-xs font-bold">#{pokemon.number} {pokemon.name}</div>
      <TypeBadges type1={pokemon.type1} type2={pokemon.type2} center small />
      <div className="text-[11px]">Total {pokemon.total}{pokemon.isStarter ? " ⭐" : ""}</div>
    </div>
  );
}
