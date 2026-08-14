# Upgrade Path (v4)

Fourth wave: a single large item, **a full rework of the attack/move
system** (damage-only moves today → damage + buff + debuff + drain +
redirect), requested 2026-08-08 right after the v3 plan
([archive/v3/main.md](archive/v3/main.md) — 5 steps, all shipped: a
tooltip hover-area bug, persistent notifications, a match-history display
bug, Burn/Freeze status effects, and a stale-inventory Team Picker bug)
shipped in full. v3 itself followed the v2 plan
([archive/v2/main.md](archive/v2/main.md), 15 steps, all shipped), which
followed the original 8-step plan ([archive/main.md](archive/main.md)).

**Steps 21-23 shipped (2026-08-12, 2026-08-14, 2026-08-14); steps 24-29
remain planning-only.** See "The attack-system rework" below before
starting any of the remaining steps. **Interim note:** as of step 23,
every newly-rolled instance gets 2 support moves that can't actually be
used in a battle yet — see step 23's "Known interim gap" — so steps
24-26 (engine execution) should follow soon.

Each step has its own file with what to build and an end state to
validate against before moving to the next step — same format as every
archived plan.

| # | Step | File | Depends on | Status |
|---|------|------|------------|--------|
| 21 | Move data model rework (damage/buff/debuff/drain/redirect) | [21-move-kind-data-model.md](21-move-kind-data-model.md) | — | **Shipped** |
| 22 | Author the buff/debuff/drain/redirect move pool | [22-buff-debuff-drain-redirect-move-pool.md](22-buff-debuff-drain-redirect-move-pool.md) | 21 | **Shipped** |
| 23 | Guaranteed 2-damage + 2-support move-slot rolling | [23-guaranteed-move-slot-rolling.md](23-guaranteed-move-slot-rolling.md) | 22 | **Shipped** |
| 24 | Battle engine: buff & debuff execution | [24-battle-engine-buffs-and-debuffs.md](24-battle-engine-buffs-and-debuffs.md) | 21, 22 | **Planned** |
| 25 | Battle engine: drain (life/mana steal) execution | [25-battle-engine-drain-moves.md](25-battle-engine-drain-moves.md) | 21, 22 | **Planned** |
| 26 | Battle engine: redirect, self-hit only | [26-battle-engine-redirect-self.md](26-battle-engine-redirect-self.md) | 21, 22 | **Planned** |
| 27 | Battle engine: redirect, extend to allies (higher-risk stretch) | [27-battle-engine-redirect-allies.md](27-battle-engine-redirect-allies.md) | 26 | **Planned** |
| 28 | Move-kind UI (badges/tooltips) + ally-target picker for buffs | [28-move-ui-and-ally-targeting.md](28-move-ui-and-ally-targeting.md) | 24, 25, 26 | **Planned** |
| 29 | Existing-instance policy + roster-wide roll validation | [29-existing-instance-policy-and-validation.md](29-existing-instance-policy-and-validation.md) | 23, 24, 25, 26, 28 | **Planned** |

## The attack-system rework

Today every move is pure damage: `{ name, type, power, category:
"Physical" | "Special", mana_cost }`. The request: add four new move
*kinds* — buffs (self/ally: atk, def, HP, mana, shield, cleanse status),
debuffs (enemy: the opposite of each), drain (life/mana steal), and
redirect (force an enemy's own future attack to hit one of their allies or
themselves) — and rework existing Pokémon so each ends up with 2
pure-damage moves + 2 of the new kinds, for more strategic depth than
today's damage-race.

**This is planning only.** Steps 21-29 exist so the shape of the rework
is written down and reviewable before any code changes — none of it
should be implemented until given an explicit go-ahead, one step at a
time, same "Working through a step" process as everything else in this
file. This is a much bigger, more structural change than any prior step
in this wave (it touches the core `Move` type, the battle engine's damage
loop, the move-rolling logic, two battle UIs, and a product decision about
already-owned Pokémon), so it's split into 9 steps instead of one, each
independently buildable and validatable, roughly mirroring how the
original 8-step and v2's 15-step plans were sized.

## Why this order

Mostly a straight dependency chain, not free ordering:
- **21 (types) must come first** — every later step's code needs the new
  `Move` discriminated union and the new `FighterState` effect fields to
  exist.
- **22 (author the actual new moves) before 23** (the roll-slot logic
  needs real moves to draw from) **and before 24/25/26** (the engine needs
  real moves to execute, not just types).
- **24, 25, 26 (buff/debuff, drain, self-redirect) are independent of each
  other** — three different move kinds' execution logic, no shared code
  path beyond what 21 already established. Could be done in any order or
  even in parallel by different people.
- **27 (extend redirect to allies) depends only on 26** — it's an
  explicitly optional, higher-risk extension of self-redirect, isolated
  into its own step specifically so it can be deferred or skipped without
  blocking anything else.
- **28 (UI) depends on 24/25/26** being done first — there's nothing to
  render badges/tooltips for, and no engine behavior to target-pick
  against, until the engine actually executes these move kinds. It
  deliberately does *not* depend on 27 — the ally-target picker step 28
  builds is for *buff* moves choosing an ally, unrelated to redirect's own
  (automatic, non-player-chosen) targeting.
- **29 (existing-instance policy + validation) is last** — it's a
  roster-wide sanity pass plus a product decision about already-owned
  Pokémon, which only makes sense to write once the rest of the system
  exists to validate against.

## Key decisions already made

From the 2026-08-08 planning conversation, research findings that shaped
the plan (see each step file for the full detail, this is the summary):

- **`pokedex.json`'s per-species `moves` field is not what players
  actually get.** Every Pokemon instance (starter grant or lootbox roll)
  gets its 4 moves from `lib/collection.ts`'s `rollMoveset()`, which draws
  randomly from a small shared pool (`lib/data/movePool.ts`, only 45
  unique moves total across all 151 species today, 85% weighted toward
  the Pokemon's own type(s)). `pokedex.json`'s embedded `moves` arrays are
  only that pool's original seed data. **This means "rework existing
  Pokémon's movesets" is a `movePool.ts`/`rollMoveset()` change, not a
  151-entry hand-edit of `pokedex.json`** — the new moves get authored
  once into the pool, and the rolling logic decides the 2-damage+2-support
  split at instance-creation time.
- **No existing power/mana_cost-scales-with-rarity convention to
  preserve.** Move power/cost is a flat, tiered attribute of the move
  itself (cheap ~40pw/10mp, mid ~60-75pw/20mp, strong ~90-120pw/30-45mp),
  identical regardless of which Pokemon rolls it — a weak Pokemon can roll
  just as strong a move as a legendary. The new buff/debuff/drain/redirect
  moves should follow the same flat-tiered-pool convention, not scale off
  a Pokemon's `total`.
- **There is currently zero targeting concept anywhere** — `AttackAction`
  is just `{ type: "attack", moveIndex }`, and every move implicitly
  resolves attacker-vs-"the opponent's active member." Debuffs and drain
  don't need new targeting (same implicit "enemy active" target damage
  moves already use). Buffs need a real target choice (self vs. a living
  ally) only in 3v3 team battles (1v1 local play has no bench, so buffs
  there are just self-targeted, no picker needed) — that's step 28.
  Redirect needs no player-facing targeting at all: it's inflicted on the
  enemy like a debuff, and *its* target-selection (which of the afflicted
  fighter's own side gets hit) happens automatically, engine-side, when
  they later act — never a player choice, same as blind's self-miss or
  dodge today.
- **Redirect-to-an-ally is real structural work, not a small addition** —
  today only a team's own *active* member can ever take damage (bench
  members' status ticks are explicitly paused until swapped in); hitting a
  benched ally requires new bench-damage handling, plus auditing
  `handleFaint`'s assumption that a fainted defender is always the
  opposing side's active member. Isolated into its own step (27),
  explicitly separate from and only optionally following self-redirect
  (26), so the simpler, lower-risk version can ship (or not) independent
  of the harder one.
- **The existing bleed/blind/poison/burn/freeze fields are untouched by
  this rework.** New buff/debuff stat modifiers (`atkMod`/`defMod` +
  their own turn counters) are a parallel, additive system, not a
  refactor of the status-effect system steps 10 and 19 already shipped
  and validated. Where a new debuff wants to *apply* one of the existing
  five statuses (a guaranteed, non-chance-based version of what a damage
  move only incidentally rolls for today), it just sets that status's
  existing field directly — no new status plumbing needed for that case.
- **One pair of signed multiplier fields serves both buffs and debuffs.**
  `atkMod`/`atkModTurns` and `defMod`/`defModTurns` on `FighterState`
  handle "Attack Up," "Attack Down," "Defense Up," and "Defense Down"
  alike (a multiplier >1 or <1, decaying via the same per-turn tick
  location the existing statuses already use) — matching the user's own
  framing ("nerf ... same as above but opposite") rather than inventing
  separate up/down fields. Each multiplies **both** the physical and
  special version of that stat together (`atkMod` scales `atk` *and*
  `spatk`; `defMod` scales `def` *and* `spdef`) so a buff/debuff is
  meaningful regardless of whether the buffed Pokemon's remaining moves
  are Physical- or Special-category.
- **Shield is a flat, un-timed absorb pool, not a turn-counted status.**
  `shieldPoints` on `FighterState` absorbs incoming damage before HP does,
  until depleted — no duration to track, it just runs out or doesn't. This
  avoids a 7th turn-counter dimension and self-limits naturally.
- **Existing already-owned Pokémon are not retroactively rewritten.**
  (Proposed default, confirm before implementing step 29.) A player's
  already-rolled instance's moves are fixed at roll time today — no prior
  step in this project has ever silently rewritten a live player's already
  -rolled stats or moves — so the plan's default is: only Pokémon rolled
  *after* step 23 ships get the new 2-damage+2-support distribution;
  already-owned Pokémon keep their current 4 (possibly all-damage)
  moveset permanently. This is a product call, not just an engineering
  one — flagged explicitly in step 29 rather than assumed silently.

## Working through a step

1. Read the step's `.md` file in full before starting.
2. Implement it in isolation — don't pull in work from later steps even if
   it seems convenient.
3. Run through the **End state** checklist at the bottom of the step file.
   Every item should be verifiable by hand (`npm run build`, a browser
   check, a Supabase table query, etc.) — if an item can't be checked, the
   step isn't actually done.
4. Only move to the next step once its listed dependencies are checked off.
