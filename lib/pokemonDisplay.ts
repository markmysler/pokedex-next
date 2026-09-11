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
// buff/debuff/redirect moves.
export function movePower(move: Move): number | null {
  return move.kind === "damage" || move.kind === "drain" ? move.power : null;
}

// Short "what this move does" fragment shown inside a move button's label,
// e.g. `${move.name} (${moveEffectText(move)} | ${move.max_uses} uses)`
// (upgrades/28-move-ui-and-ally-targeting.md, cost phrasing updated by
// upgrades/40-uses-based-move-data-model.md -- full uses-remaining display
// polish is upgrades/43-uses-ui-and-server-validation.md's job, this is
// just enough to compile against the new field names). Damage's own text
// ("40 Pwr") deliberately matches the pre-existing damage-only label
// exactly, so that case reads as unchanged.
export function moveEffectText(move: Move): string {
  if (move.kind === "damage") return `${move.power} Pwr`;
  // resource is always "hp" as of upgrades/40-uses-based-move-data-model.md
  if (move.kind === "drain") return `${move.power} Pwr, ${move.drain.percentOfDamageDealt}% HP drain`;
  if (move.kind === "redirect") return `${move.turns} turns confused`;

  if (move.kind === "buff") {
    const buff = move.buff;
    if (buff.effect === "statUp") {
      const pct = Math.round((buff.multiplier - 1) * 100);
      return `+${pct}% ${buff.stat === "atk" ? "ATK" : "DEF"}, ${buff.turns} turns`;
    }
    if (buff.effect === "heal") return `+${buff.percentOfMaxHp}% HP`;
    if (buff.effect === "shield") return `+${buff.amount} Shield`;
    return "Cleanse";
  }

  const debuff = move.debuff;
  if (debuff.effect === "statDown") {
    const pct = Math.round((debuff.multiplier - 1) * 100);
    return `${pct}% ${debuff.stat === "atk" ? "ATK" : "DEF"}, ${debuff.turns} turns`;
  }
  if (debuff.effect === "removeShield") return "Remove Shield";
  return debuff.status.charAt(0).toUpperCase() + debuff.status.slice(1);
}

// Full plain-English sentence for a move button's `title` tooltip
// (upgrades/28-move-ui-and-ally-targeting.md) -- same "explain the actual
// mechanic, not just restate the name" spirit as FighterCard.tsx's
// STATUS_TOOLTIPS.
export function moveTooltip(move: Move): string {
  const usesText = move.max_uses === null ? "unlimited uses" : `${move.max_uses} uses per battle`;
  const base = `${move.name} (${move.type}-type, ${usesText})`;

  if (move.kind === "damage") return `${base}: a ${move.category.toLowerCase()} attack, ${move.power} power.`;
  // resource is always "hp" as of upgrades/40-uses-based-move-data-model.md
  if (move.kind === "drain") {
    return `${base}: a ${move.category.toLowerCase()} attack, ${move.power} power, that also restores ${move.drain.percentOfDamageDealt}% of the raw damage dealt as HP to the user.`;
  }
  if (move.kind === "redirect") {
    return `${base}: confuses the target for ${move.turns} turns -- while confused, its own attacks land on itself or a living ally instead of the opponent.`;
  }

  if (move.kind === "buff") {
    const buff = move.buff;
    if (buff.effect === "statUp") return `${base}: raises the target's ${buff.stat === "atk" ? "Attack" : "Defense"} to x${buff.multiplier} for ${buff.turns} turns.`;
    if (buff.effect === "heal") return `${base}: heals the target for ${buff.percentOfMaxHp}% of its max HP.`;
    if (buff.effect === "shield") return `${base}: grants the target a ${buff.amount}-point shield that absorbs incoming damage before HP.`;
    return `${base}: cleanses bleed/blind/poison/burn/freeze from the target.`;
  }

  const debuff = move.debuff;
  if (debuff.effect === "statDown") return `${base}: lowers the enemy's ${debuff.stat === "atk" ? "Attack" : "Defense"} to x${debuff.multiplier} for ${debuff.turns} turns.`;
  if (debuff.effect === "removeShield") return `${base}: destroys the enemy's shield.`;
  return `${base}: guarantees ${debuff.status} on the enemy -- no chance roll, unlike the incidental version.`;
}
