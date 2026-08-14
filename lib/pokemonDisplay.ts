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
// e.g. `${move.name} (${moveEffectText(move)} | ${move.mana_cost} MP)`
// (upgrades/28-move-ui-and-ally-targeting.md). Damage's own text
// ("40 Pwr") deliberately matches the pre-existing damage-only label
// exactly, so that case reads as unchanged.
export function moveEffectText(move: Move): string {
  if (move.kind === "damage") return `${move.power} Pwr`;
  if (move.kind === "drain") {
    const resource = move.drain.resource === "hp" ? "HP" : "MP";
    return `${move.power} Pwr, ${move.drain.percentOfDamageDealt}% ${resource} drain`;
  }
  if (move.kind === "redirect") return `${move.turns} turns confused`;

  if (move.kind === "buff") {
    const buff = move.buff;
    if (buff.effect === "statUp") {
      const pct = Math.round((buff.multiplier - 1) * 100);
      return `+${pct}% ${buff.stat === "atk" ? "ATK" : "DEF"}, ${buff.turns} turns`;
    }
    if (buff.effect === "heal") return `+${buff.percentOfMaxHp}% HP`;
    if (buff.effect === "restoreMana") return `+${buff.amount} MP`;
    if (buff.effect === "shield") return `+${buff.amount} Shield`;
    return "Cleanse";
  }

  const debuff = move.debuff;
  if (debuff.effect === "statDown") {
    const pct = Math.round((debuff.multiplier - 1) * 100);
    return `${pct}% ${debuff.stat === "atk" ? "ATK" : "DEF"}, ${debuff.turns} turns`;
  }
  if (debuff.effect === "drainMana") return `-${debuff.amount} MP`;
  if (debuff.effect === "removeShield") return "Remove Shield";
  return debuff.status.charAt(0).toUpperCase() + debuff.status.slice(1);
}

// Full plain-English sentence for a move button's `title` tooltip
// (upgrades/28-move-ui-and-ally-targeting.md) -- same "explain the actual
// mechanic, not just restate the name" spirit as FighterCard.tsx's
// STATUS_TOOLTIPS.
export function moveTooltip(move: Move): string {
  const base = `${move.name} (${move.type}-type, ${move.mana_cost} MP)`;

  if (move.kind === "damage") return `${base}: a ${move.category.toLowerCase()} attack, ${move.power} power.`;
  if (move.kind === "drain") {
    const resource = move.drain.resource === "hp" ? "HP" : "MP";
    return `${base}: a ${move.category.toLowerCase()} attack, ${move.power} power, that also restores ${move.drain.percentOfDamageDealt}% of the raw damage dealt as ${resource} to the user.`;
  }
  if (move.kind === "redirect") {
    return `${base}: confuses the target for ${move.turns} turns -- while confused, its own attacks land on itself or a living ally instead of the opponent.`;
  }

  if (move.kind === "buff") {
    const buff = move.buff;
    if (buff.effect === "statUp") return `${base}: raises the target's ${buff.stat === "atk" ? "Attack" : "Defense"} to x${buff.multiplier} for ${buff.turns} turns.`;
    if (buff.effect === "heal") return `${base}: heals the target for ${buff.percentOfMaxHp}% of its max HP.`;
    if (buff.effect === "restoreMana") return `${base}: restores ${buff.amount} MP to the target.`;
    if (buff.effect === "shield") return `${base}: grants the target a ${buff.amount}-point shield that absorbs incoming damage before HP.`;
    return `${base}: cleanses bleed/blind/poison/burn/freeze from the target.`;
  }

  const debuff = move.debuff;
  if (debuff.effect === "statDown") return `${base}: lowers the enemy's ${debuff.stat === "atk" ? "Attack" : "Defense"} to x${debuff.multiplier} for ${debuff.turns} turns.`;
  if (debuff.effect === "drainMana") return `${base}: drains ${debuff.amount} MP from the enemy.`;
  if (debuff.effect === "removeShield") return `${base}: destroys the enemy's shield.`;
  return `${base}: guarantees ${debuff.status} on the enemy -- no chance roll, unlike the incidental version.`;
}
