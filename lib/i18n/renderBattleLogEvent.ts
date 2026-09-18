import type { BattleLogEvent } from "@/lib/battleEngine";
import type { Dictionary } from "./getDictionary";

export interface RenderedLogLine {
  text: string;
  // Drives the same .win/.loss/.hit CSS classes the old classifyLogLine()
  // did (app/globals.css's ".battle-log .win/.loss/.hit") -- "win"/"loss"
  // are never produced here (those are BattleArena.tsx/OnlineBattle.tsx's
  // own client-built banner lines, classified directly at the call site
  // since the caller already knows what it's building); only "hit" comes
  // from this renderer, and only for a moveUsed event that actually
  // connected (carries effectivenessMultiplier).
  kind?: "win" | "loss" | "hit";
}

// Turns one lib/battleEngine.ts BattleLogEvent into a localized sentence
// (upgrades/56-i18n-battle-cluster.md) -- the engine itself builds no text
// in any language anymore, only this structured data. Classification is
// decided from the event's own `type`, never by pattern-matching the
// rendered (translated) text, which is what the old classifyLogLine() did
// and would have silently broken for es-AR (its "Hit"/"EFFECT" substring
// match could never appear in a Spanish sentence).
//
// Prefix convention, matching the original hand-built log lines exactly:
// "moveUsed" gets "• ", "switched" has no wrapper prefix (its own dict
// string already starts with "↩️ "), everything else gets "  -> ".
export function renderBattleLogEvent(event: BattleLogEvent, dict: Dictionary): RenderedLogLine {
  const t = dict.battle.log;

  switch (event.type) {
    case "moveUsed": {
      const detail = event.power !== null ? t.moveDetailDamage(event.moveType, event.power) : event.moveType;
      const usesText = event.maxUses === null ? t.unlimitedUses : t.usesLeft(event.usesRemaining ?? 0, event.maxUses);
      let text = `• ${t.moveUsedLine(event.attacker, event.move, detail, usesText)}`;
      let kind: "hit" | undefined;
      if (event.effectivenessMultiplier !== undefined) {
        const mult = event.effectivenessMultiplier;
        const suffix = mult >= 2.0 ? t.superEffective : mult === 0.0 ? t.noEffect : mult < 1.0 ? t.notVeryEffective : t.normalHit;
        text += ` ${suffix}`;
        kind = "hit";
      }
      return { text, kind };
    }
    case "dodged":
      return { text: `  -> ${t.dodged(event.defender)}` };
    case "blindMiss":
      return { text: `  -> ${t.blindMiss(event.attacker)}` };
    case "selfHit":
      return { text: `  -> ${t.selfHit(event.attacker)}` };
    case "allyHit":
      return { text: `  -> ${t.allyHit(event.attacker, event.ally)}` };
    case "damageDealt": {
      const { target, amount, absorbedByShield, hpAfter } = event;
      if (absorbedByShield <= 0) return { text: `  -> ${t.dealtDamage(target, amount, hpAfter)}` };
      if (absorbedByShield >= amount) return { text: `  -> ${t.shieldAbsorbedAll(amount)}` };
      return { text: `  -> ${t.shieldAbsorbedPartial(absorbedByShield, amount - absorbedByShield, target, hpAfter)}` };
    }
    case "statusInflicted": {
      const adjective = dict.battle.statusAdjective[event.status];
      const lowered = adjective.charAt(0).toLowerCase() + adjective.slice(1);
      return { text: `  -> ${t.statusInflicted(event.target, lowered)}` };
    }
    case "drained":
      return { text: `  -> ${t.drained(event.attacker, event.amount, event.hpAfter, event.maxHp)}` };
    case "statUp":
      return { text: `  -> ${t.statUp(event.target, dict.common.stats[event.stat], event.multiplier, event.turns)}` };
    case "healed":
      return { text: `  -> ${t.healed(event.target, event.amount, event.hpAfter, event.maxHp)}` };
    case "shielded":
      return { text: `  -> ${t.shielded(event.target, event.amount, event.total)}` };
    case "cleansed":
      return { text: `  -> ${t.cleansed(event.target)}` };
    case "statDown":
      return { text: `  -> ${t.statDown(event.target, dict.common.stats[event.stat], event.multiplier, event.turns)}` };
    case "shieldDestroyed":
      return { text: `  -> ${t.shieldDestroyed(event.target)}` };
    case "confused":
      return { text: `  -> ${t.confused(event.target, event.turns)}` };
    case "statusTick":
      return { text: `  -> ${t.statusTick(event.status, event.target, event.amount, event.turnsLeft)}` };
    case "freezeTick":
      return { text: `  -> ${t.freezeTick(event.target, event.turnsLeft)}` };
    case "statModExpired":
      return { text: `  -> ${t.statModExpired(event.target, dict.common.stats[event.stat], event.wasBuff)}` };
    case "confusionExpired":
      return { text: `  -> ${t.confusionExpired(event.target)}` };
    case "fainted":
      return {
        text: `  -> ${event.forcesSwitch === null ? t.fainted(event.pokemon) : t.faintedForcesSwitch(event.pokemon, event.forcesSwitch)}`,
      };
    case "switched":
      return { text: t.switched(event.from, event.to) };
  }
}
