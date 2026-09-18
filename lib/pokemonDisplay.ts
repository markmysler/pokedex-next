import type { Move, OwnedPokemon } from "@/types/pokemon";
import type { Dictionary } from "@/lib/i18n/getDictionary";

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
// e.g. `${move.name} (${moveEffectText(move, dict)} | ${move.max_uses} uses)`
// (upgrades/28-move-ui-and-ally-targeting.md, cost phrasing updated by
// upgrades/40-uses-based-move-data-model.md -- full uses-remaining display
// polish is upgrades/43-uses-ui-and-server-validation.md's job, this is
// just enough to compile against the new field names). Damage's own text
// ("40 Pwr") deliberately matches the pre-existing damage-only label
// exactly, so that case reads as unchanged.
//
// `dict` param added in upgrades/56-i18n-battle-cluster.md -- this used to
// return hardcoded English; MoveButton.tsx (its only caller) now threads
// its own useDictionary() result through.
export function moveEffectText(move: Move, dict: Dictionary): string {
  const t = dict.battle.moveEffect;
  if (move.kind === "damage") return t.pwr(move.power);
  // resource is always "hp" as of upgrades/40-uses-based-move-data-model.md
  if (move.kind === "drain") return t.drainShort(move.power, move.drain.percentOfDamageDealt);
  if (move.kind === "redirect") return t.confusedTurnsShort(move.turns);

  if (move.kind === "buff") {
    const buff = move.buff;
    if (buff.effect === "statUp") {
      const pct = Math.round((buff.multiplier - 1) * 100);
      return t.statUpShort(pct, t.statAbbrev[buff.stat], buff.turns);
    }
    if (buff.effect === "heal") return t.healShort(buff.percentOfMaxHp);
    if (buff.effect === "shield") return t.shieldShort(buff.amount);
    return t.cleanse;
  }

  const debuff = move.debuff;
  if (debuff.effect === "statDown") {
    const pct = Math.round((debuff.multiplier - 1) * 100);
    return t.statDownShort(pct, t.statAbbrev[debuff.stat], debuff.turns);
  }
  if (debuff.effect === "removeShield") return t.removeShield;
  return dict.battle.statusNoun[debuff.status];
}

// Full plain-language sentence for a move button's `title` tooltip
// (upgrades/28-move-ui-and-ally-targeting.md) -- same "explain the actual
// mechanic, not just restate the name" spirit as FighterCard.tsx's
// STATUS_TOOLTIPS. `dict` param added in upgrades/56-i18n-battle-cluster.md,
// same reasoning as moveEffectText() above.
export function moveTooltip(move: Move, dict: Dictionary): string {
  const t = dict.battle.moveTooltip;
  const usesText = move.max_uses === null ? t.unlimitedUses : t.usesPerBattle(move.max_uses);
  const base = t.base(move.name, move.type, usesText);

  if (move.kind === "damage") {
    const category = move.category === "Physical" ? t.categoryPhysical : t.categorySpecial;
    return t.damage(base, category, move.power);
  }
  // resource is always "hp" as of upgrades/40-uses-based-move-data-model.md
  if (move.kind === "drain") {
    const category = move.category === "Physical" ? t.categoryPhysical : t.categorySpecial;
    return t.drain(base, category, move.power, move.drain.percentOfDamageDealt);
  }
  if (move.kind === "redirect") {
    return t.redirect(base, move.turns);
  }

  if (move.kind === "buff") {
    const buff = move.buff;
    if (buff.effect === "statUp") return t.buffStatUp(base, dict.common.stats[buff.stat], buff.multiplier, buff.turns);
    if (buff.effect === "heal") return t.buffHeal(base, buff.percentOfMaxHp);
    if (buff.effect === "shield") return t.buffShield(base, buff.amount);
    return t.buffCleanse(base);
  }

  const debuff = move.debuff;
  if (debuff.effect === "statDown") return t.debuffStatDown(base, dict.common.stats[debuff.stat], debuff.multiplier, debuff.turns);
  if (debuff.effect === "removeShield") return t.debuffRemoveShield(base);
  return t.debuffInflictStatus(base, dict.battle.statusNoun[debuff.status].toLowerCase());
}
