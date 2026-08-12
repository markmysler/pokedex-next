import type { Move, OwnedPokemon } from "@/types/pokemon";

// The primary label for an owned instance: its nickname if the owner set
// one, otherwise the species name (upgrades/08-pokemon-nicknames.md). One
// shared helper instead of repeating `pokemon.nickname ?? pokemon.name` at
// every display site.
export function displayName(pokemon: Pick<OwnedPokemon, "nickname" | "name">): string {
  return pokemon.nickname ?? pokemon.name;
}

// Power only exists on kinds that deal direct damage
// (upgrades/21-move-kind-data-model.md's discriminated union) -- null for
// buff/debuff/redirect moves. Full move-kind display (badges/tooltips) is
// upgrades/28-move-ui-and-ally-targeting.md's job; this is just enough to
// keep today's damage-only display sites compiling and unchanged.
export function movePower(move: Move): number | null {
  return move.kind === "damage" || move.kind === "drain" ? move.power : null;
}
