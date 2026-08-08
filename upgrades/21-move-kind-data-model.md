# Step 21: Move data model rework — damage/buff/debuff/drain/redirect

**Status: planning only — not implemented.** Do not start this step
without an explicit go-ahead; see `main.md`'s "The attack-system rework"
section for the full context and dependency chain.

## Why here

First step of the attack-system rework — every later step (the move
pool, the roll logic, the battle engine, the UI) needs these types to
exist first. No behavior change in this step: existing pure-damage moves
keep working exactly as they do today, just re-shaped into the new type.

## What changes

### The problem with today's `Move` type

```ts
export type MoveCategory = "Physical" | "Special";
export interface Move {
  name: string;
  type: PokemonType;
  power: number;
  category: MoveCategory;
  mana_cost: number;
}
```

`power`/`category` only make sense for a move that deals direct damage.
Bolting buff/debuff/drain/redirect fields onto this same flat shape would
mean every move object carries a pile of fields that are meaningless for
its actual kind (a buff move with a `power` that's never read, a redirect
move with a `category` that's never read) — a discriminated union is the
correct shape here, not more optional fields.

### The new `Move` type (`types/pokemon.ts`)

```ts
export type MoveKind = "damage" | "buff" | "debuff" | "drain" | "redirect";
export type StatModKey = "atk" | "def"; // see main.md's key decision — atk scales atk+spatk together, def scales def+spdef together

interface BaseMove {
  name: string;
  type: PokemonType;
  mana_cost: number;
  kind: MoveKind;
}

export interface DamageMove extends BaseMove {
  kind: "damage";
  category: "Physical" | "Special";
  power: number;
}

export type BuffEffect =
  | { effect: "statUp"; stat: StatModKey; multiplier: number; turns: number } // e.g. 1.3 for 3 turns
  | { effect: "heal"; percentOfMaxHp: number } // instant, not a turn-counter
  | { effect: "restoreMana"; amount: number } // instant
  | { effect: "shield"; amount: number } // adds to shieldPoints, no duration
  | { effect: "cleanse" }; // clears bleed/blind/poison/burn/freeze turns

export interface BuffMove extends BaseMove {
  kind: "buff";
  buff: BuffEffect;
}

export type DebuffEffect =
  | { effect: "statDown"; stat: StatModKey; multiplier: number; turns: number } // e.g. 0.7 for 3 turns
  | { effect: "drainMana"; amount: number } // instant, subtracts from target's mp
  | { effect: "removeShield" } // instant, zeroes target's shieldPoints
  | { effect: "inflictStatus"; status: "bleed" | "blind" | "poison" | "burn" | "freeze" }; // guaranteed, bypasses the normal chance roll

export interface DebuffMove extends BaseMove {
  kind: "debuff";
  debuff: DebuffEffect;
}

export interface DrainMove extends BaseMove {
  kind: "drain";
  category: "Physical" | "Special"; // still deals damage using the existing formula
  power: number;
  drain: { resource: "hp" | "mp"; percentOfDamageDealt: number }; // e.g. 50 = heal/restore 50% of the damage this hit dealt
}

export interface RedirectMove extends BaseMove {
  kind: "redirect";
  turns: number; // how many of the target's own future attacks get redirected
}

export type Move = DamageMove | BuffMove | DebuffMove | DrainMove | RedirectMove;
```

Every existing move in `lib/data/movePool.ts` becomes a `DamageMove`
(`kind: "damage"` added to each entry) — a mechanical migration, no values
change.

### New `FighterState` fields (`types/pokemon.ts`)

```ts
export interface FighterState {
  // ...existing hp/maxHp/mp/maxMp/pokemon/bleedTurns/blindTurns/poisonTurns/burnTurns/freezeTurns, all untouched...

  // Buff/debuff stat modifiers (step 24) -- one signed pair per stat,
  // shared by buffs (multiplier > 1) and debuffs (multiplier < 1).
  // Defaults: 1 / 0 (no effect). atkMod scales atk+spatk together;
  // defMod scales def+spdef together (main.md's key decision).
  atkMod: number;
  atkModTurns: number;
  defMod: number;
  defModTurns: number;

  // Shield (step 24) -- flat absorb pool, consumed by incoming damage
  // before HP is touched. No duration; it just runs out or doesn't.
  shieldPoints: number;

  // Redirect (steps 26/27) -- while > 0, this fighter's own attacks
  // resolve against a target chosen from *their own* side instead of the
  // opponent's, decided engine-side (never a player choice).
  redirectTurns: number;
}
```

`buildFighterState()` (`lib/battleEngine.ts`) gets these six new fields
added to its returned object, all zeroed/defaulted (`atkMod: 1,
atkModTurns: 0, defMod: 1, defModTurns: 0, shieldPoints: 0,
redirectTurns: 0`) — same pattern as `bleedTurns: 0` etc. today.

### What does NOT change in this step

- `lib/battleEngine.ts`'s actual execution logic — `executeMove()` still
  only knows how to run a `DamageMove`. A TypeScript discriminated union
  means code that only handles `"damage"` today will need a
  `switch`/narrowing added before it compiles against the new type (that
  narrowing is steps 24-26's job, not this one) — this step's own scope
  is just making the type change compile, wiring the new fields through
  `buildFighterState()`, and leaving `executeMove()`'s actual behavior
  identical for damage moves.
- Nothing in `lib/data/movePool.ts` beyond the mechanical `kind: "damage"`
  addition — authoring the actual new buff/debuff/drain/redirect move
  entries is step 22.
- `lib/collection.ts`'s `rollMoveset()` — still draws 4 moves from
  whatever pool exists at the time (which, after this step alone, is
  still 100% damage moves) — the guaranteed-slot rework is step 23.

## End state

- [ ] `types/pokemon.ts` has the new `Move` discriminated union and the
      six new `FighterState` fields, as specified above (or a
      close/justified variant decided during implementation).
- [ ] Every existing entry in `lib/data/movePool.ts` compiles as a valid
      `DamageMove` (`kind: "damage"` added, no other values changed).
- [ ] `buildFighterState()` initializes all six new fields to their
      defaults.
- [ ] `npm run build` / `npm run lint` clean — this is the real test of
      this step, since a discriminated union change will surface every
      place that assumed `Move` was flat and needs a narrowing `switch` or
      cast added to keep compiling (expected in `lib/battleEngine.ts`,
      `components/battle/MoveButton.tsx`, anywhere else `.power`/
      `.category` is read directly).
- [ ] A full existing online battle (1v1 local and 3v3 online) still plays
      correctly end-to-end with damage-only moves — regression check that
      this purely-typological step didn't change any runtime behavior.
