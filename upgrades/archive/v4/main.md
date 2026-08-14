# Upgrade Path (v4)

Fourth wave: a single large item, **a full rework of the attack/move
system** (damage-only moves today → damage + buff + debuff + drain +
redirect), requested 2026-08-08 right after the v3 plan
([archive/v3/main.md](../v3/main.md) — 5 steps, all shipped: a tooltip
hover-area bug, persistent notifications, a match-history display bug,
Burn/Freeze status effects, and a stale-inventory Team Picker bug)
shipped in full. v3 itself followed the v2 plan
([archive/v2/main.md](../v2/main.md), 15 steps, all shipped), which
followed the original 8-step plan ([archive/main.md](../main.md)).

Today every move was pure damage: `{ name, type, power, category:
"Physical" | "Special", mana_cost }`. The request: add four new move
*kinds* — buffs (self/ally: atk, def, HP, mana, shield, cleanse status),
debuffs (enemy: the opposite of each), drain (life/mana steal), and
redirect (force an enemy's own future attack to hit one of their allies
or themselves) — and rework existing Pokémon so each ends up with 2
pure-damage moves + 2 of the new kinds, for more strategic depth than the
prior damage-race. All 9 steps shipped, 2026-08-12 through 2026-08-14.

Each step has its own file with what to build and an end state to
validate against before moving to the next step — same format as every
earlier archived plan.

| # | Step | File | Depends on |
|---|------|------|------------|
| 21 | Move data model rework (damage/buff/debuff/drain/redirect) | [21-move-kind-data-model.md](21-move-kind-data-model.md) | — |
| 22 | Author the buff/debuff/drain/redirect move pool | [22-buff-debuff-drain-redirect-move-pool.md](22-buff-debuff-drain-redirect-move-pool.md) | 21 |
| 23 | Guaranteed 2-damage + 2-support move-slot rolling | [23-guaranteed-move-slot-rolling.md](23-guaranteed-move-slot-rolling.md) | 22 |
| 24 | Battle engine: buff & debuff execution | [24-battle-engine-buffs-and-debuffs.md](24-battle-engine-buffs-and-debuffs.md) | 21, 22 |
| 25 | Battle engine: drain (life/mana steal) execution | [25-battle-engine-drain-moves.md](25-battle-engine-drain-moves.md) | 21, 22 |
| 26 | Battle engine: redirect, self-hit only | [26-battle-engine-redirect-self.md](26-battle-engine-redirect-self.md) | 21, 22 |
| 27 | Battle engine: redirect, extend to allies (higher-risk stretch) | [27-battle-engine-redirect-allies.md](27-battle-engine-redirect-allies.md) | 26 |
| 28 | Move-kind UI (badges/tooltips) + ally-target picker for buffs | [28-move-ui-and-ally-targeting.md](28-move-ui-and-ally-targeting.md) | 24, 25, 26 |
| 29 | Existing-instance policy + roster-wide roll validation | [29-existing-instance-policy-and-validation.md](29-existing-instance-policy-and-validation.md) | 23, 24, 25, 26, 28 |

## Why this order

Mostly a straight dependency chain, not free ordering:
- **21 (types) had to come first** — every later step's code needed the
  new `Move` discriminated union and the new `FighterState` effect fields
  to exist.
- **22 (author the actual new moves) before 23** (the roll-slot logic
  needed real moves to draw from) **and before 24/25/26** (the engine
  needed real moves to execute, not just types).
- **24, 25, 26 (buff/debuff, drain, self-redirect) were independent of
  each other** — three different move kinds' execution logic, no shared
  code path beyond what 21 established.
- **27 (extend redirect to allies) depended only on 26** — an explicitly
  optional, higher-risk extension of self-redirect, isolated into its own
  step specifically so it could be deferred or skipped without blocking
  anything else. Shipped in the end.
- **28 (UI) depended on 24/25/26** being done first — nothing to render
  badges/tooltips for, and no engine behavior to target-pick against,
  until the engine actually executed these move kinds. Deliberately did
  *not* depend on 27 — the ally-target picker step 28 built is for *buff*
  moves choosing an ally, unrelated to redirect's own (automatic,
  non-player-chosen) targeting.
- **29 (existing-instance policy + validation) was last** — a roster-wide
  sanity pass plus a product decision about already-owned Pokémon, which
  only made sense to write once the rest of the system existed to
  validate against.

## Key decisions made

From the 2026-08-08 planning conversation and the implementation itself:

- **`pokedex.json`'s per-species `moves` field was never what players
  actually got.** Every Pokemon instance (starter grant or lootbox roll)
  gets its 4 moves from `lib/collection.ts`'s `rollMoveset()`, drawing
  from a shared pool (`lib/data/movePool.ts`) — `pokedex.json`'s embedded
  `moves` arrays are only that pool's original seed data. The rework was
  a `movePool.ts`/`rollMoveset()` change, not a 151-entry hand-edit.
- **No power/mana_cost-scales-with-rarity convention.** Move power/cost
  is a flat, tiered attribute of the move itself, identical regardless of
  which Pokemon rolls it. The new buff/debuff/drain/redirect moves
  followed the same flat-tiered-pool convention.
- **Redirect needs no player-facing targeting** — it's inflicted like a
  debuff, and its own target-selection (which of the afflicted fighter's
  own side gets hit) happens automatically, engine-side, when they later
  act — never a player choice.
- **One pair of signed multiplier fields serves both buffs and debuffs.**
  `atkMod`/`atkModTurns` and `defMod`/`defModTurns` on `FighterState`
  handle "Attack Up," "Attack Down," "Defense Up," and "Defense Down"
  alike — a multiplier >1 or <1, decaying via the same per-turn tick
  location the existing statuses already used. `atkMod` scales `atk` and
  `spatk` together; `defMod` scales `def` and `spdef` together.
- **Shield is a flat, un-timed absorb pool.** `shieldPoints` absorbs
  incoming damage before HP, until depleted — no duration to track.
- **Drain's heal is based on raw (pre-shield) damage, one-sided.** A
  shield protects the target's own HP but doesn't reduce how much the
  attacker draws off the hit; the target doesn't separately lose the
  drained amount beyond the damage already dealt.
- **Redirect extends to allies (step 27) in 3v3 only** — 1v1 has no
  bench/ally concept and stays always-self permanently. Ally-redirect was
  the first case in the codebase where a hit could land on a benched
  member; `handleFaint()` gained an `isActive` parameter so a benched
  friendly-fire faint skips the forced-switch it would otherwise trigger.
- **Existing already-owned Pokémon: the user chose the backfill
  alternative**, not the "leave them alone" default. See step 29's own
  file for the full dry-run-then-execute process; net effect, confirmed
  live: every non-starter `pokemon_instances` row now has a real
  2-damage+2-support moveset, and starters were deliberately left
  untouched (fixed/permanent by design, never rolled via `rollMoveset()`).

## Validated against the live deployment, not just locally

Steps 21-29 were also validated with real HTTP calls against the
production Vercel deployment (`https://pokedex-next-rho.vercel.app`)
using disposable test accounts, played through the actual API routes
against the real Supabase database, then deleted. That process surfaced
and fixed a real, unrelated pre-existing bug: `handle_new_user()`'s
hardcoded starter moves (and, it turned out, every already-existing
non-starter instance too) predated step 21's `kind` field entirely,
silently making every affected Pokémon's attacks deal 0 damage in battle.
Both fixed via production migrations
(`20260814000000_starter_move_kind_fix.sql` for starters, step 29's
backfill for everything else) with explicit user sign-off before each
write, confirmed live afterward.

## Working through a step

1. Read the step's `.md` file in full before starting.
2. Implement it in isolation — don't pull in work from later steps even if
   it seems convenient.
3. Run through the **End state** checklist at the bottom of the step file.
   Every item should be verifiable by hand (`npm run build`, a browser
   check, a Supabase table query, etc.) — if an item can't be checked, the
   step isn't actually done.
4. Only move to the next step once its listed dependencies are checked off.
