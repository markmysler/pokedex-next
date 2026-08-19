import type { BattleAction, BuffMove, DamageMove, DebuffMove, DrainMove, FighterState, RedirectMove, RoomSlot, TeamState, Move, PokemonType } from "@/types/pokemon";
import { getTypeMultiplier } from "./typeData";

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randUniform(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function effectivenessText(mult: number): string {
  if (mult >= 2.0) return "⚡ SUPER EFFECTIVE! (2.0x)";
  if (mult === 0.0) return "🛡️ NO EFFECT (0.0x)";
  if (mult < 1.0) return "🛡️ Not very effective... (0.5x)";
  return "💥 Normal Hit (1.0x)";
}

// Per-line battle-log highlighting (upgrades/main.md's DESIGN_SYSTEM.md §6
// originally specified this; it never made it into the shipped markup
// until a post-wave audit caught the gap). Both BattleArena.tsx and
// OnlineBattle.tsx render one line of `log` per array entry and apply
// whichever class this returns -- shared here rather than duplicated so
// the two consumers can't drift on what counts as a "win" or a "hit" line.
export function classifyLogLine(line: string): "win" | "loss" | "hit" | undefined {
  if (line.includes("VICTORY")) return "win";
  if (line.includes("DEFEAT")) return "loss";
  if (/Hit|EFFECT/i.test(line)) return "hit";
  return undefined;
}

// --- Status effects (upgrades/10-battle-depth.md) --------------------------
// Additive layer on top of the existing damage formula, which is unchanged
// for a non-dodged, non-blinded hit. Defaults to tune once played, same
// framing as step 3's shiny threshold — reasonable starting points, not a
// spec to hit exactly.

const DODGE_CAP = 0.35;
const STATUS_INFLICT_CAP = 0.3;
const STATUS_DURATION = 3;
const BLEED_TICK_RATIO = 0.05;
const POISON_TICK_RATIO = 0.05;
const BLIND_MISS_CHANCE = 0.25;
// Burn/Freeze (upgrades/19-burn-and-freeze-status-effects.md) — burn is a
// damage tick like bleed/poison, doubled against a Grass-type target
// ("extra effect", mirroring a super-effective hit but on the status's own
// damage rather than the move's). Freeze isn't a tick at all: while active
// it knocks 30% off the frozen fighter's own atk/def/spd, checked wherever
// those stats get read (executeMove's atkStat/defStat, and the speed roll
// that decides turn order).
const BURN_TICK_RATIO = 0.05;
const BURN_TICK_RATIO_VS_GRASS = 0.1;
const FREEZE_STAT_MULT = 0.7;

export type StatusKind = "bleed" | "blind" | "poison" | "burn" | "freeze";

function hasType(pokemon: { type1: PokemonType; type2: PokemonType | null }, type: PokemonType): boolean {
  return pokemon.type1 === type || pokemon.type2 === type;
}

function setStatusTurns(state: FighterState, status: StatusKind, turns: number): void {
  if (status === "bleed") state.bleedTurns = turns;
  else if (status === "blind") state.blindTurns = turns;
  else if (status === "poison") state.poisonTurns = turns;
  else if (status === "burn") state.burnTurns = turns;
  else state.freezeTurns = turns;
}

// Shared exact wording with the existing chance-based infliction in
// executeMove()'s damage branch, so a guaranteed debuff-inflicted status
// (upgrades/24-battle-engine-buffs-and-debuffs.md) reads identically to an
// incidental one.
function statusInflictLogLine(status: StatusKind, targetName: string): string {
  switch (status) {
    case "bleed": return `  -> 🩸 ${targetName} is bleeding!`;
    case "blind": return `  -> 🌀 ${targetName} is blinded!`;
    case "poison": return `  -> ☠️ ${targetName} is poisoned!`;
    case "burn": return `  -> 🔥 ${targetName} is burned!`;
    case "freeze": return `  -> ❄️ ${targetName} is frozen!`;
  }
}

// Shield-aware damage application (upgrades/24-battle-engine-buffs-and
// -debuffs.md) -- shared by regular damage moves and (step 25) drain moves.
// Absorbs into shieldPoints before HP, partial or full. Returns how much
// the shield absorbed, so the caller can log it.
function applyDamage(state: FighterState, dmg: number): number {
  const absorbedByShield = Math.min(state.shieldPoints, dmg);
  state.shieldPoints -= absorbedByShield;
  const remaining = dmg - absorbedByShield;
  state.hp = Math.max(0, state.hp - remaining);
  return absorbedByShield;
}

function damageLogLine(defenderName: string, attackerName: string, dmg: number, absorbed: number, hpAfter: number, mpAfter: number): string {
  if (absorbed <= 0) return `  -> Dealt ${dmg} damage! ${defenderName} HP: ${hpAfter} | ${attackerName} Mana: ${mpAfter}/100`;
  if (absorbed >= dmg) return `  -> 🛡️ Shield absorbed all ${dmg} damage!`;
  return `  -> 🛡️ Shield absorbed ${absorbed} damage! Dealt ${dmg - absorbed} damage! ${defenderName} HP: ${hpAfter} | ${attackerName} Mana: ${mpAfter}/100`;
}

// Applied at the point atk/def/spd are actually read, not stored back onto
// the Pokemon's base stats — a frozen fighter's own numbers are unchanged,
// only what battleEngine derives from them this instant.
function freezeAdjusted(stat: number, state: FighterState): number {
  return state.freezeTurns > 0 ? stat * FREEZE_STAT_MULT : stat;
}

// Buff/debuff stat modifiers (upgrades/24-battle-engine-buffs-and-debuffs.md)
// compose multiplicatively with freeze's existing multiplier, not
// override it -- a frozen *and* debuffed fighter is doubly weakened.
// `mod` is the fighter's own atkMod or defMod, whichever `stat` is.
function effectiveStat(stat: number, state: FighterState, mod: number): number {
  return freezeAdjusted(stat, state) * mod;
}

function rollDodgeChance(attackerSpd: number, defenderSpd: number): number {
  return clamp((defenderSpd - attackerSpd) / (attackerSpd + defenderSpd + 100), 0, DODGE_CAP);
}

// Same atk-vs-def comparison already used for damage — a high defensive
// stat already lowers the opposing chance, no separate resist formula
// needed (upgrades/10-battle-depth.md's "stat dual roles").
function rollInflictChance(atkStat: number, defStat: number): number {
  return clamp((atkStat - defStat) / (atkStat + defStat), 0, STATUS_INFLICT_CAP);
}

// Applied at the start of the *active* member's turn — never to a benched
// Pokemon, which keeps its counters frozen until swapped back in. Mutates
// `state` in place; returns the tick's log lines (empty if not afflicted).
function applyStatusTick(state: FighterState): string[] {
  const log: string[] = [];
  if (state.hp <= 0) return log;

  if (state.bleedTurns > 0) {
    const dmg = Math.max(1, Math.round(state.maxHp * BLEED_TICK_RATIO));
    state.hp = Math.max(0, state.hp - dmg);
    state.bleedTurns -= 1;
    const remaining = state.bleedTurns > 0 ? ` (${state.bleedTurns} turn${state.bleedTurns === 1 ? "" : "s"} left)` : " — bleeding wore off.";
    log.push(`  -> 🩸 ${state.pokemon.name} takes ${dmg} bleed damage!${remaining}`);
  }
  if (state.hp > 0 && state.poisonTurns > 0) {
    const dmg = Math.max(1, Math.round(state.maxHp * POISON_TICK_RATIO));
    state.hp = Math.max(0, state.hp - dmg);
    state.poisonTurns -= 1;
    const remaining = state.poisonTurns > 0 ? ` (${state.poisonTurns} turn${state.poisonTurns === 1 ? "" : "s"} left)` : " — poison wore off.";
    log.push(`  -> ☠️ ${state.pokemon.name} takes ${dmg} poison damage!${remaining}`);
  }
  if (state.hp > 0 && state.burnTurns > 0) {
    const ratio = hasType(state.pokemon, "Grass") ? BURN_TICK_RATIO_VS_GRASS : BURN_TICK_RATIO;
    const dmg = Math.max(1, Math.round(state.maxHp * ratio));
    state.hp = Math.max(0, state.hp - dmg);
    state.burnTurns -= 1;
    const remaining = state.burnTurns > 0 ? ` (${state.burnTurns} turn${state.burnTurns === 1 ? "" : "s"} left)` : " — the burn wore off.";
    log.push(`  -> 🔥 ${state.pokemon.name} takes ${dmg} burn damage!${remaining}`);
  }
  if (state.hp > 0 && state.freezeTurns > 0) {
    state.freezeTurns -= 1;
    const remaining = state.freezeTurns > 0 ? ` (${state.freezeTurns} turn${state.freezeTurns === 1 ? "" : "s"} left)` : " — it thawed out.";
    log.push(`  -> ❄️ ${state.pokemon.name} is frozen, sapping its Attack, Defense and Speed!${remaining}`);
  }
  // Buff/debuff stat modifiers (upgrades/24-battle-engine-buffs-and-debuffs
  // .md) decay the same way as the five statuses above -- only shieldPoints
  // (no duration, self-limits by depletion) and redirectTurns (step 26's
  // own concern) are deliberately excluded from this tick.
  if (state.hp > 0 && state.atkModTurns > 0) {
    state.atkModTurns -= 1;
    if (state.atkModTurns === 0) {
      const wasBuff = state.atkMod > 1;
      log.push(`  -> ${wasBuff ? "💪" : "💢"} ${state.pokemon.name}'s Attack ${wasBuff ? "boost" : "drop"} wore off!`);
      state.atkMod = 1;
    }
  }
  if (state.hp > 0 && state.defModTurns > 0) {
    state.defModTurns -= 1;
    if (state.defModTurns === 0) {
      const wasBuff = state.defMod > 1;
      log.push(`  -> ${wasBuff ? "💪" : "💢"} ${state.pokemon.name}'s Defense ${wasBuff ? "boost" : "drop"} wore off!`);
      state.defMod = 1;
    }
  }
  // Redirect (upgrades/26-battle-engine-redirect-self.md) decays the same
  // way -- same tick point, same "paused while benched" rule.
  if (state.hp > 0 && state.redirectTurns > 0) {
    state.redirectTurns -= 1;
    if (state.redirectTurns === 0) {
      log.push(`  -> 🌀 Confused no longer — ${state.pokemon.name}'s attacks aimed correctly again.`);
    }
  }
  return log;
}

export interface MoveResult {
  log: string[];
  hit: boolean;
  dealt: number;
  statusInflicted: StatusKind[];
}

interface ExecuteMoveOptions {
  forceMiss?: boolean;
  missReason?: "dodge" | "blind";
  // Set by resolveTeamRound() (upgrades/27-battle-engine-redirect-allies
  // .md) when the target was chosen by a redirect roll, so executeDamage()
  // can log distinct "hurt itself" vs "hit its own ally" phrasing instead
  // of the normal attack-on-opponent line. 1v1's resolveRound() never sets
  // this -- its self-hit is still detected via reference equality, same as
  // step 26 (redirect in 1v1 is always self, there's no ally concept).
  redirectKind?: "self" | "ally";
  // Ally-target picker for buff moves in 3v3 team battles (upgrades/28
  // -move-ui-and-ally-targeting.md) -- undefined means self (the only
  // valid target in 1v1, or when the caster has no living ally).
  buffTarget?: FighterState;
}

// Power/category only exist on damage (and, from step 25, drain) moves —
// everything else's header just shows the type.
function moveHeader(casterName: string, move: Move, costStr: string): string {
  const detail = move.kind === "damage" || move.kind === "drain" ? `${move.type}, ${move.power} Pwr` : move.type;
  return `• ${casterName} used [${move.name}] (${detail} | ${costStr})!`;
}

// Mutates attacker/defender state in place. Mana cost is always paid,
// whether the move connects or not — dodging/blinded-flailing still means
// the move was cast. Damage math is byte-for-byte what it was before step
// 21; the only new thing on a landed damage hit is rolling for status
// inflict (upgrades/10) and shield absorption (upgrades/24). Buff/debuff
// execution added in upgrades/24-battle-engine-buffs-and-debuffs.md; drain
// added in upgrades/25-battle-engine-drain-moves.md; redirect added in
// upgrades/26-battle-engine-redirect-self.md.
export function executeMove(
  attackerState: FighterState,
  defenderState: FighterState,
  move: Move,
  opts?: ExecuteMoveOptions
): MoveResult {
  const attacker = attackerState.pokemon;
  const defender = defenderState.pokemon;
  const cost = move.mana_cost ?? 10;

  attackerState.mp = Math.max(0, attackerState.mp - cost);
  if (cost === 0) attackerState.mp = Math.min(attackerState.maxMp, attackerState.mp + 15);

  const costStr = cost > 0 ? `-${cost} MP` : "+15 MP Energy Surge!";
  const header = moveHeader(attacker.name, move, costStr);

  if (opts?.forceMiss) {
    const missLine =
      opts.missReason === "dodge"
        ? `  -> 💨 ${defender.name} dodged the attack!`
        : `  -> 🌀 ${attacker.name} is blinded and flailed, missing the attack!`;
    return { log: [header, missLine], hit: false, dealt: 0, statusInflicted: [] };
  }

  if (move.kind === "damage" || move.kind === "drain") return executeDamage(attackerState, defenderState, move, header, opts?.redirectKind);
  if (move.kind === "buff") return executeBuff(attackerState, opts?.buffTarget ?? attackerState, move, header);
  if (move.kind === "debuff") return executeDebuff(defenderState, move, header);
  return executeRedirect(defenderState, move, header);
}

// Shared by DamageMove and DrainMove (upgrades/25-battle-engine-drain
// -moves.md) -- a drain move is a damage move with one extra effect
// attached, not a different damage model. Same atkStat/defStat/type-mult/
// RNG-roll math and shield-aware applyDamage() either way.
function executeDamage(attackerState: FighterState, defenderState: FighterState, move: DamageMove | DrainMove, header: string, redirectKind?: "self" | "ally"): MoveResult {
  const attacker = attackerState.pokemon;
  const defender = defenderState.pokemon;
  const mult = getTypeMultiplier(move.type, defender.type1, defender.type2);

  const isSpecial = move.category === "Special";
  const atkStat = Math.max(10, effectiveStat(isSpecial ? attacker.spatk : attacker.atk, attackerState, attackerState.atkMod));
  const defStat = Math.max(10, effectiveStat(isSpecial ? defender.spdef : defender.def, defenderState, defenderState.defMod));

  const rawDmg = ((2 * 50) / 5 + 2) * (atkStat / Math.max(1, defStat)) * move.power / 50 + 2;
  const rng = randUniform(0.85, 1.15);
  const dmg = Math.max(1, Math.floor(rawDmg * mult * rng));

  const absorbed = applyDamage(defenderState, dmg);

  // A redirected fighter's own attack landing on themselves (upgrades/26
  // -battle-engine-redirect-self.md) is the same object for attacker and
  // defender -- called out explicitly in the log instead of the default
  // phrasing, which would otherwise read like a copy-paste bug ("Pikachu
  // used Tackle... Pikachu HP: ..."). Landing on a living ally instead
  // (upgrades/27-battle-engine-redirect-allies.md) gets its own distinct
  // "friendly fire" phrasing so it doesn't read like the opponent did it.
  const selfHit = redirectKind === "self" || attackerState === defenderState;
  const allyHit = redirectKind === "ally";
  const log = [
    `${header} ${effectivenessText(mult)}`,
    ...(selfHit ? [`  -> 🌀 ${attacker.name} is confused! It hurt itself in its confusion!`] : []),
    ...(allyHit ? [`  -> 🌀 ${attacker.name} is confused and attacks its own ally, ${defender.name}!`] : []),
    damageLogLine(defender.name, attacker.name, dmg, absorbed, defenderState.hp, attackerState.mp),
  ];

  const statusInflicted: StatusKind[] = [];
  if (defenderState.hp > 0) {
    const inflictChance = rollInflictChance(atkStat, defStat);
    if (!isSpecial && Math.random() < inflictChance) {
      defenderState.bleedTurns = STATUS_DURATION;
      statusInflicted.push("bleed");
      log.push(statusInflictLogLine("bleed", defender.name));
    }
    if (isSpecial && Math.random() < inflictChance) {
      defenderState.blindTurns = STATUS_DURATION;
      statusInflicted.push("blind");
      log.push(statusInflictLogLine("blind", defender.name));
    }
    // Poison-type moves roll independently of category — a physical
    // Poison-type move can inflict both bleed and poison on the same hit,
    // similar mechanism as bleed but keyed by move type instead of
    // physical/special (added alongside dodge/bleed/blind).
    if (move.type === "Poison" && Math.random() < inflictChance) {
      defenderState.poisonTurns = STATUS_DURATION;
      statusInflicted.push("poison");
      log.push(statusInflictLogLine("poison", defender.name));
    }
    // Fire/Ice-typed moves roll independently too, each with a type-based
    // immunity a Water/Fire-type target respectively is naturally immune to
    // (upgrades/19-burn-and-freeze-status-effects.md) -- checked before the
    // roll, same shape as any other type immunity, just for the status
    // rather than the hit itself.
    if (move.type === "Fire" && !hasType(defender, "Water") && Math.random() < inflictChance) {
      defenderState.burnTurns = STATUS_DURATION;
      statusInflicted.push("burn");
      log.push(statusInflictLogLine("burn", defender.name));
    }
    if (move.type === "Ice" && !hasType(defender, "Fire") && Math.random() < inflictChance) {
      defenderState.freezeTurns = STATUS_DURATION;
      statusInflicted.push("freeze");
      log.push(statusInflictLogLine("freeze", defender.name));
    }
  }

  if (move.kind === "drain") {
    // Based on the *raw* damage the move would have dealt (pre-shield
    // absorption), not what actually landed on HP -- a shield protects the
    // defender's own HP, it doesn't reduce how much the attacker draws off
    // the hit. Same reasoning for overkill: the full raw damage counts even
    // if it's far more than the defender's remaining HP. One-sided: the
    // defender doesn't separately lose the drained amount beyond the
    // damage already applied above.
    const healAmount = Math.round(dmg * (move.drain.percentOfDamageDealt / 100));
    if (move.drain.resource === "hp") {
      attackerState.hp = Math.min(attackerState.maxHp, attackerState.hp + healAmount);
      log.push(`  -> 🩸 ${attacker.name} drained ${healAmount} HP! (${attackerState.hp}/${attackerState.maxHp})`);
    } else {
      attackerState.mp = Math.min(attackerState.maxMp, attackerState.mp + healAmount);
      log.push(`  -> 🔷 ${attacker.name} drained ${healAmount} MP! (${attackerState.mp}/${attackerState.maxMp})`);
    }
  }

  return { log, hit: true, dealt: dmg, statusInflicted };
}

// Targets the caster (self) by default, or an explicitly-chosen living
// ally in a 3v3 team battle (upgrades/28-move-ui-and-ally-targeting.md).
// Mana is still paid by the caster (already handled in executeMove above)
// regardless of who the effect lands on.
function executeBuff(casterState: FighterState, targetState: FighterState, move: BuffMove, header: string): MoveResult {
  const target = targetState.pokemon;
  const log = [header];
  const buff = move.buff;

  switch (buff.effect) {
    case "statUp": {
      // Overwrites, not stacks -- refreshes back to full duration/magnitude
      // on re-cast rather than compounding (same precedent as bleed/poison
      // etc.'s "refreshed, not stacked" re-inflict behavior).
      if (buff.stat === "atk") {
        targetState.atkMod = buff.multiplier;
        targetState.atkModTurns = buff.turns;
      } else {
        targetState.defMod = buff.multiplier;
        targetState.defModTurns = buff.turns;
      }
      const statName = buff.stat === "atk" ? "Attack" : "Defense";
      log.push(`  -> ✨ ${target.name}'s ${statName} rose to x${buff.multiplier} for ${buff.turns} turns!`);
      break;
    }
    case "heal": {
      const amount = Math.round((targetState.maxHp * buff.percentOfMaxHp) / 100);
      targetState.hp = Math.min(targetState.maxHp, targetState.hp + amount);
      log.push(`  -> 💚 ${target.name} healed ${amount} HP! (${targetState.hp}/${targetState.maxHp})`);
      break;
    }
    case "restoreMana": {
      targetState.mp = Math.min(targetState.maxMp, targetState.mp + buff.amount);
      log.push(`  -> 🔷 ${target.name} restored ${buff.amount} MP! (${targetState.mp}/${targetState.maxMp})`);
      break;
    }
    case "shield": {
      // Additive -- a second shield cast while one is already up stacks
      // the pool, unlike statUp's refresh-not-stack (shields have no
      // duration to conflict over).
      targetState.shieldPoints += buff.amount;
      log.push(`  -> 🛡️ ${target.name} gained a ${buff.amount}-point shield! (total: ${targetState.shieldPoints})`);
      break;
    }
    case "cleanse": {
      targetState.bleedTurns = 0;
      targetState.blindTurns = 0;
      targetState.poisonTurns = 0;
      targetState.burnTurns = 0;
      targetState.freezeTurns = 0;
      log.push(`  -> 🌿 ${target.name}'s status ailments were cleansed!`);
      break;
    }
  }

  return { log, hit: true, dealt: 0, statusInflicted: [] };
}

// Always targets the opponent's active member -- same implicit targeting
// damage moves already use, no picker needed (main.md's key decision).
function executeDebuff(defenderState: FighterState, move: DebuffMove, header: string): MoveResult {
  const defender = defenderState.pokemon;
  const log = [header];
  const debuff = move.debuff;
  const statusInflicted: StatusKind[] = [];

  switch (debuff.effect) {
    case "statDown": {
      if (debuff.stat === "atk") {
        defenderState.atkMod = debuff.multiplier;
        defenderState.atkModTurns = debuff.turns;
      } else {
        defenderState.defMod = debuff.multiplier;
        defenderState.defModTurns = debuff.turns;
      }
      const statName = debuff.stat === "atk" ? "Attack" : "Defense";
      log.push(`  -> 💢 ${defender.name}'s ${statName} fell to x${debuff.multiplier} for ${debuff.turns} turns!`);
      break;
    }
    case "drainMana": {
      defenderState.mp = Math.max(0, defenderState.mp - debuff.amount);
      log.push(`  -> 🔻 ${defender.name} lost ${debuff.amount} MP! (${defenderState.mp}/${defenderState.maxMp})`);
      break;
    }
    case "removeShield": {
      defenderState.shieldPoints = 0;
      log.push(`  -> 💥 ${defender.name}'s shield was destroyed!`);
      break;
    }
    case "inflictStatus": {
      // Guaranteed, no roll -- distinct from the chance-based infliction
      // executeDamage() above still does; that stays untouched.
      setStatusTurns(defenderState, debuff.status, STATUS_DURATION);
      statusInflicted.push(debuff.status);
      log.push(statusInflictLogLine(debuff.status, defender.name));
      break;
    }
  }

  return { log, hit: true, dealt: 0, statusInflicted };
}

// Inflicting redirect targets the opponent's active member exactly like a
// debuff (upgrades/26-battle-engine-redirect-self.md) -- no new targeting
// UI. *Consuming* it (making the afflicted fighter's own next attacks land
// on themselves) is resolveRound()/resolveTeamRound()'s job, not this
// function's -- it just sets the counter.
function executeRedirect(defenderState: FighterState, move: RedirectMove, header: string): MoveResult {
  const defender = defenderState.pokemon;
  defenderState.redirectTurns = move.turns;
  const log = [header, `  -> 🌀 ${defender.name} is confused about who to attack, for ${move.turns} turns!`];
  return { log, hit: true, dealt: 0, statusInflicted: [] };
}

// Rolls blind's self-miss (and decrements blindTurns once per attack
// attempt, whether it hits or misses) and dodge, then delegates to
// executeMove with the outcome already decided.
function resolveAttack(atkState: FighterState, defState: FighterState, move: Move, redirectKind?: "self" | "ally", buffTarget?: FighterState): MoveResult {
  let blindMiss = false;
  if (atkState.blindTurns > 0) {
    blindMiss = Math.random() < BLIND_MISS_CHANCE;
    atkState.blindTurns -= 1;
  }
  const dodged = !blindMiss && Math.random() < rollDodgeChance(atkState.pokemon.spd, defState.pokemon.spd);

  if (blindMiss || dodged) {
    return executeMove(atkState, defState, move, { forceMiss: true, missReason: blindMiss ? "blind" : "dodge", redirectKind, buffTarget });
  }
  return executeMove(atkState, defState, move, { redirectKind, buffTarget });
}

export interface BattleEvent {
  slot: RoomSlot;
  moveType: PokemonType;
  hit: boolean;
  dealt: number;
  statusInflicted: StatusKind[];
  fainted: boolean;
}

export interface RoundResult {
  log: string[];
  over: boolean;
  winner: RoomSlot | null;
  events: BattleEvent[];
}

// Mutates fighter1State/fighter2State in place (HP/MP after the round). Pure otherwise.
export function resolveRound(
  fighter1State: FighterState,
  fighter2State: FighterState,
  move1: Move,
  move2: Move
): RoundResult {
  const log: string[] = [];
  const events: BattleEvent[] = [];

  fighter1State.mp = Math.min(fighter1State.maxMp, fighter1State.mp + 15);
  fighter2State.mp = Math.min(fighter2State.maxMp, fighter2State.mp + 15);

  const p1Speed = freezeAdjusted(fighter1State.pokemon.spd, fighter1State) + randInt(-2, 2);
  const p2Speed = freezeAdjusted(fighter2State.pokemon.spd, fighter2State) + randInt(-2, 2);

  const order: Array<[FighterState, FighterState, Move, RoomSlot]> =
    p1Speed >= p2Speed
      ? [
          [fighter1State, fighter2State, move1, 1],
          [fighter2State, fighter1State, move2, 2],
        ]
      : [
          [fighter2State, fighter1State, move2, 2],
          [fighter1State, fighter2State, move1, 1],
        ];

  for (const [atkState, defState, move, slot] of order) {
    if (fighter1State.hp <= 0 || fighter2State.hp <= 0) break;

    log.push(...applyStatusTick(atkState));
    if (atkState.hp <= 0) continue; // fainted from its own tick before acting

    // Redirect (upgrades/26-battle-engine-redirect-self.md): while active,
    // this fighter's own attack lands on themselves instead of the
    // opponent. 1v1 has no bench/ally concept, so self is the only
    // possible redirect target here even after step 27 ships.
    const target = atkState.redirectTurns > 0 ? atkState : defState;

    const result = resolveAttack(atkState, target, move);
    log.push(...result.log);
    events.push({
      slot,
      moveType: move.type,
      hit: result.hit,
      dealt: result.dealt,
      statusInflicted: result.statusInflicted,
      fainted: target.hp <= 0,
    });

    if (fighter1State.hp <= 0 || fighter2State.hp <= 0) break;
  }

  const over = fighter1State.hp <= 0 || fighter2State.hp <= 0;
  const winner: RoomSlot | null = !over ? null : fighter1State.hp <= 0 ? 2 : 1;

  return { log, over, winner, events };
}

export function buildFighterState(pokemon: FighterState["pokemon"]): FighterState {
  const maxHp = Math.max(50, Math.round(pokemon.hp * 2.5));
  return {
    hp: maxHp,
    maxHp,
    mp: 100,
    maxMp: 100,
    pokemon,
    bleedTurns: 0,
    blindTurns: 0,
    poisonTurns: 0,
    burnTurns: 0,
    freezeTurns: 0,
    atkMod: 1,
    atkModTurns: 0,
    defMod: 1,
    defModTurns: 0,
    shieldPoints: 0,
    redirectTurns: 0,
  };
}

// --- 3v3 online battles (upgrades/05-3v3-battles.md) — the 1v1 functions
// above stay exactly as they are, still used by the local Battle Arena. ---

export function buildTeamState(pokemon: FighterState["pokemon"][]): TeamState {
  const members = pokemon.map(buildFighterState);
  return { members: [members[0], members[1], members[2]], activeIndex: 0 };
}

function activeMember(team: TeamState): FighterState {
  return team.members[team.activeIndex];
}

function isTeamWiped(team: TeamState): boolean {
  return team.members.every((m) => m.hp <= 0);
}

// Redirect target selection (upgrades/27-battle-engine-redirect-allies.md)
// -- rolls among the attacker's own living team members, including
// themselves (step 26's self-only behavior is the size-1-living-member
// special case of this, not a separate code path). 1v1 has no team/bench
// concept, so resolveRound() never calls this -- it keeps step 26's
// always-self behavior permanently.
function pickRedirectTarget(atkTeam: TeamState): FighterState {
  const livingMembers = atkTeam.members.filter((m) => m.hp > 0);
  return livingMembers[Math.floor(Math.random() * livingMembers.length)];
}

// Whether `team`'s active member has a living teammate to target (bench or
// otherwise) -- upgrades/28-move-ui-and-ally-targeting.md's gate for
// showing the buff ally-target picker at all client-side (no picker for a
// choice that isn't actually a choice). Exported for the UI to reuse
// rather than reimplementing this same team-shape query.
export function hasLivingAlly(team: TeamState): boolean {
  return team.members.some((m, i) => i !== team.activeIndex && m.hp > 0);
}

// Resolves a buff move's chosen target (upgrades/28-move-ui-and-ally
// -targeting.md): defaults to self, same as every other move kind's
// implicit targeting elsewhere in this file. An out-of-range or fainted
// index is defensively treated as "no valid choice" and falls back to
// self, same spirit as existing move-index bounds checks -- the server
// never trusts the client beyond "which index was chosen."
function resolveBuffTarget(atkTeam: TeamState, atkState: FighterState, teamIndex: 0 | 1 | 2 | undefined): FighterState {
  if (teamIndex === undefined) return atkState;
  const candidate = atkTeam.members[teamIndex];
  if (!candidate || candidate.hp <= 0) return atkState;
  return candidate;
}

export interface TeamRoundResult {
  log: string[];
  over: boolean;
  winner: RoomSlot | null;
  awaitingForcedSwitch: RoomSlot | null;
  events: BattleEvent[];
}

interface FaintOutcome {
  over: boolean;
  winner: RoomSlot | null;
  awaitingForcedSwitch: RoomSlot | null;
}

// Shared by "attacker fainted from its own status tick," "defender fainted
// from a hit," and (upgrades/27-battle-engine-redirect-allies.md) "a
// benched ally fainted from friendly-fire redirect" — same team-wipe
// computation every time. `isActive` (default true, matching every
// pre-step-27 call site's actual behavior) is the only thing that differs:
// a benched member fainting doesn't force a switch, since the team's
// active member is unaffected and can still act this round.
function handleFaint(faintedSlot: RoomSlot, faintedTeam: TeamState, faintedName: string, log: string[], isActive = true): FaintOutcome {
  if (isTeamWiped(faintedTeam)) {
    return { over: true, winner: faintedSlot === 1 ? 2 : 1, awaitingForcedSwitch: null };
  }
  if (!isActive) {
    log.push(`  -> ${faintedName} fainted!`);
    return { over: false, winner: null, awaitingForcedSwitch: null };
  }
  log.push(`  -> ${faintedName} fainted! Player ${faintedSlot} must send out another Pokémon.`);
  return { over: false, winner: null, awaitingForcedSwitch: faintedSlot };
}

// Mutates team1State/team2State in place (activeIndex, HP/MP of whichever
// members acted). Switches apply before attacks; an attacker whose own
// active fainted earlier this same round can't act (mirrors the old
// resolveRound's "break on faint", generalized from "battle over" to
// "this side's queued action doesn't happen").
export function resolveTeamRound(
  team1State: TeamState,
  team2State: TeamState,
  action1: BattleAction,
  action2: BattleAction
): TeamRoundResult {
  const log: string[] = [];
  const events: BattleEvent[] = [];

  if (action1.type === "switch") log.push(...applySwitch(team1State, action1.teamIndex));
  if (action2.type === "switch") log.push(...applySwitch(team2State, action2.teamIndex));

  const active1 = activeMember(team1State);
  const active2 = activeMember(team2State);
  active1.mp = Math.min(active1.maxMp, active1.mp + 15);
  active2.mp = Math.min(active2.maxMp, active2.mp + 15);

  const p1Speed = freezeAdjusted(active1.pokemon.spd, active1) + randInt(-2, 2);
  const p2Speed = freezeAdjusted(active2.pokemon.spd, active2) + randInt(-2, 2);
  const order: RoomSlot[] = p1Speed >= p2Speed ? [1, 2] : [2, 1];

  let awaitingForcedSwitch: RoomSlot | null = null;
  let over = false;
  let winner: RoomSlot | null = null;

  for (const slot of order) {
    if (over) break;

    const action = slot === 1 ? action1 : action2;
    const atkTeam = slot === 1 ? team1State : team2State;
    const defTeam = slot === 1 ? team2State : team1State;
    const atkState = activeMember(atkTeam);

    // Status tick happens at the start of this side's turn regardless of
    // what they do this round (attack or switch) — only for whichever
    // member is currently active, post-any-switch already applied above.
    if (atkState.hp > 0) {
      log.push(...applyStatusTick(atkState));
      if (atkState.hp <= 0) {
        const outcome = handleFaint(slot, atkTeam, atkState.pokemon.name, log);
        over = outcome.over;
        winner = outcome.winner;
        if (outcome.awaitingForcedSwitch) awaitingForcedSwitch = outcome.awaitingForcedSwitch;
        if (over) break;
        continue; // fainted from the tick, can't also attack this turn
      }
    }

    if (action.type !== "attack") continue; // switches already applied above
    if (atkState.hp <= 0) continue; // defensive; already handled above

    const defState = activeMember(defTeam);
    if (defState.hp <= 0) continue; // defender already fainted earlier this round

    const move = atkState.pokemon.moves[action.moveIndex];
    if (!move) continue; // validated by the caller before reaching here

    // Redirect (upgrades/26-battle-engine-redirect-self.md, extended to
    // allies in upgrades/27-battle-engine-redirect-allies.md): while
    // active, this fighter's own attack lands on a random living member of
    // their *own* team (including a benched one, including themselves)
    // instead of the opponent's active member.
    const redirectTarget = atkState.redirectTurns > 0 ? pickRedirectTarget(atkTeam) : null;
    const target = redirectTarget ?? defState;
    const redirectKind: "self" | "ally" | undefined =
      redirectTarget === null ? undefined : redirectTarget === atkState ? "self" : "ally";

    // Ally-target picker for buff moves (upgrades/28-move-ui-and-ally
    // -targeting.md) -- only meaningful for a buff; every other kind
    // ignores action.buffTargetTeamIndex entirely (ignored automatically
    // here too, since resolveBuffTarget() is only even consulted below).
    const buffTarget = move.kind === "buff" ? resolveBuffTarget(atkTeam, atkState, action.buffTargetTeamIndex) : undefined;

    const result = resolveAttack(atkState, target, move, redirectKind, buffTarget);
    log.push(...result.log);
    events.push({
      slot,
      moveType: move.type,
      hit: result.hit,
      dealt: result.dealt,
      statusInflicted: result.statusInflicted,
      fainted: target.hp <= 0,
    });

    if (target.hp <= 0) {
      // A self/ally-redirect faint is the attacker's own side going down,
      // not the defender's -- reuse the exact same handleFaint()
      // bookkeeping (team-wipe computation is identical either way),
      // pointed at whichever side actually took the hit. A benched ally
      // faint (target isn't its team's active member) doesn't force a
      // switch -- the active member is untouched and can still act.
      const isOwnTeam = redirectKind !== undefined;
      const faintedSlot: RoomSlot = isOwnTeam ? slot : slot === 1 ? 2 : 1;
      const faintedTeam = isOwnTeam ? atkTeam : defTeam;
      const isActive = target === activeMember(faintedTeam);
      const outcome = handleFaint(faintedSlot, faintedTeam, target.pokemon.name, log, isActive);
      over = outcome.over;
      winner = outcome.winner;
      if (outcome.awaitingForcedSwitch) awaitingForcedSwitch = outcome.awaitingForcedSwitch;
      if (over) break;
    }
  }

  return { log, over, winner, awaitingForcedSwitch, events };
}

function applySwitch(team: TeamState, teamIndex: 0 | 1 | 2): string[] {
  const from = activeMember(team).pokemon.name;
  team.activeIndex = teamIndex;
  const to = activeMember(team).pokemon.name;
  return [`↩️ ${from} is withdrawn! ${to}, go!`];
}
