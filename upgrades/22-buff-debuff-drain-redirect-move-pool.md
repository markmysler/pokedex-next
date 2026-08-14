# Step 22: Author the buff/debuff/drain/redirect move pool

**Status: shipped**, 2026-08-14. See `main.md`'s "The attack-system
rework" section for the full context and dependency chain.

## Why here

Step 21 made the type system support the new move kinds; this step
actually writes the new moves into `lib/data/movePool.ts` so step 23 (roll
logic) and steps 24-26 (engine) have real content to draw from and test
against.

## What changes

### Where these live

`lib/data/movePool.ts` today holds `allMoves`/`movesByType`, all
`DamageMove`s harvested from `pokedex.json`. This step adds new exported
pools alongside it — `buffMoves`, `debuffMoves`, `drainMoves`,
`redirectMoves` (plus their own `*ByType` maps, mirroring
`movesByType`'s shape, for the same 85%-own-type weighting
`rollMoveset()` already does for damage moves) — authored directly in
`movePool.ts`, not derived from `pokedex.json` (which has no buff/debuff/
drain/redirect data to harvest from).

### Sizing the pool

Not one move per Pokemon type (18 types × 4 kinds = 72 moves) — that's
more authoring than this app's existing 45-move damage pool has. Mirror
the existing pool's actual density instead: a modest, mostly-generic set
per kind (roughly 8-12 buff moves, 8-12 debuff moves, 6-8 drain moves,
3-5 redirect moves — around 30 new moves total, similar order of
magnitude to today's 45), most tagged as a specific type where it's
thematically obvious (a Water-type heal, an Electric-type mana-drain), a
few tagged `type: "Normal"` or otherwise generic where no type fits
naturally (a generic shield move, a generic cleanse move) so every
Pokemon's 85%-own-type roll still has *something* to draw from even for
types that don't have an obvious flavor match.

### Magnitude/cost conventions (flat-tiered, matching the existing damage
pool's convention documented in `main.md` — no scaling by a Pokemon's
`total`)

These are starting points to tune once played, same framing as prior
status-effect defaults (steps 10, 19) — not a spec to hit exactly:

- **Buff — statUp**: `+30%` (`multiplier: 1.3`) for 3 turns, ~20 mana. A
  cheaper, weaker variant (`+15%`, 2 turns, ~10 mana) and a pricier
  stronger one (`+50%`, 3 turns, ~30 mana) round out the tier, mirroring
  the damage pool's cheap/mid/strong pattern.
- **Buff — heal**: `25%` of max HP for ~20 mana; a stronger `40%` for
  ~35 mana.
- **Buff — restoreMana**: a flat amount (e.g. 30) for a *cheap* mana cost
  (e.g. 5) — needs to actually be worth casting relative to just not
  spending mana that turn, so the net gain should be clearly positive.
- **Buff — shield**: a flat `shieldPoints` amount roughly equal to a
  mid-tier hit's damage (so it meaningfully blocks ~1 incoming attack),
  ~20-25 mana.
- **Buff — cleanse**: ~15 mana, no magnitude to tune (it's binary).
- **Debuff — statDown**: mirror statUp exactly (`0.7`/`0.85`/`0.5`
  multipliers instead of `1.3`/`1.15`/`1.5`), same turn/cost tiers.
- **Debuff — drainMana**: a flat amount (e.g. 20-30) for a cheap cost —
  this is a tempo play (deny the opponent's next big move), not raw
  damage, so keep it cheap enough to be worth casting proactively.
- **Debuff — removeShield**: cheap (~10 mana) — low reward if the enemy
  has no shield up, so it shouldn't also be expensive.
- **Debuff — inflictStatus**: pricier than the incidental chance-based
  version (~25-30 mana) since it's guaranteed instead of a ~30%-capped
  roll — reuses whichever status fits the move's own type (a Poison-type
  debuff move guarantee-inflicts poison, a Fire-type one guarantees burn,
  etc.), same type-to-status mapping steps 10/19 already established.
- **Drain**: same power/mana_cost tiers as equivalent-tier damage moves
  (a drain move isn't "free" extra value — it should hit a bit softer
  than a pure-damage move of the same cost, since it's also healing), with
  `percentOfDamageDealt` around 40-50%.
- **Redirect**: 2-3 turns of redirection, ~25-30 mana (it's a strong
  tempo/disruption effect — deals no damage itself, so its whole value is
  the turns of denial it buys).

### Naming

Real move-like names, matching the existing pool's convention (not
literal "Buff Move"/"Debuff Move" placeholders) — e.g. "Iron Defense"
(def statUp), "Screech" (def statDown), "Recover" (heal), "Meditate"
(atk statUp), "Confuse Ray" (redirect), "Drain Punch" (Fighting-type
drain), "Leech Seed"-style (Grass-type drain), "Reflect Type"/"Taunt"-
style flavor names for the rest — exact list to be finalized during
implementation, not prescribed field-by-field here.

## End state

- [x] `lib/data/movePool.ts` exports `buffMoves`, `debuffMoves`,
      `drainMoves`, `redirectMoves` (plus per-type maps), each populated
      with a real, named, flat-tiered set per the sizing/magnitude
      guidance above. (11 buffs, 12 debuffs, 8 drains, 4 redirects — 35
      total, same order of magnitude as the existing 45-move damage pool.
      A shared `groupByType()` helper builds all five `*ByType` maps,
      including the pre-existing damage-pool one, instead of five
      copy-pasted loops.)
- [x] Every new move is a valid instance of its corresponding `Move`
      union member from step 21 (compiles with no `any`/casts needed).
- [x] At least one move of each new kind exists that is NOT tagged to a
      specific type (i.e. usable as a fallback for any Pokemon during
      step 23's rolling, regardless of its own type(s)). (Tagged `type:
      "Normal"`, the same convention the existing damage pool already
      uses for its own generic moves — "Swords Dance", "Harden",
      "Recover", "Refresh" (buff), "Growl", "Leer" (debuff), "Life Steal"
      (drain), "Disorient" (redirect).)
- [x] Spot-check: every one of the 18 `PokemonType`s has at least one
      buff move and one debuff move it can roll via the 85%-own-type path
      (either a type-tagged move of that exact type, or reliance on the
      generic fallback pool covers it) — no type should be structurally
      unable to roll a support move. (Verified by script: for any type
      with no type-tagged move, `rollMoveset()`'s existing pattern —
      `useOwnType` only fires when the own-type pool is non-empty — falls
      through to the full pool 100% of the time, so every type is
      structurally covered.)
- [x] `npm run build` / `npm run lint` clean.

Also validated: no move name collides with the existing 45-move damage
pool or with another new move; every drain's `percentOfDamageDealt` and
every redirect's `turns`/`mana_cost` fall inside the ranges the step doc
specifies; a full 1v1 and 3v3 battle still resolve correctly end-to-end
(this step doesn't touch the battle engine or rolling logic, so this is
just a no-regression check).
