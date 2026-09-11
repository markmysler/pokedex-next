# Upgrade Path

## The mana-to-uses migration (in progress — steps 40–41 shipped, 2026-09-11)

Sixth wave, requested 2026-08-19 right after the fifth wave's (full visual
redesign, 10 steps + a same-day fix pass — see
[archive/v5/main.md](archive/v5/main.md)) shipped in full. v5 followed
[archive/v4/main.md](archive/v4/main.md) (the attack/move-kind rework, 9
steps), which followed [archive/v3/main.md](archive/v3/main.md) (5 steps),
which followed [archive/v2/main.md](archive/v2/main.md) (15 steps), which
followed the original 8-step plan in [archive/main.md](archive/main.md).

Today every move costs `mana_cost` against a shared, per-battle
`mp`/`maxMp` pool (100/100, regenerating +15/round) — any move is castable
indefinitely as long as the pool covers it. The request: replace this with
a **per-move, per-battle uses cap** — a move can be cast at most `max_uses`
times per battle, full stop, no regeneration, no shared pool. Every Pokemon
must keep at least one damage move castable for free (specifically: its
*weakest* damage move, computed dynamically per-instance, not a fixed
catalog move) — "equivalent to having an attack that consumes zero mana."

Bundled into the same wave, at the user's request, as a balance patch:
**move-slot composition changes from 2-damage+2-support to 3-damage+
1-support** for every rolled instance (and, per this wave's own scope,
every *already-owned* instance and every starter too — no "leave existing
Pokemon alone" carve-out this time, which is a deliberate reversal of
`archive/v4/main.md`'s precedent for starters specifically). Also bundled:
**bot-battle lootbox drop rate increases from 25% to 60%** (online-battle
wins stay their existing unconditional 100%, untouched).

| # | Step | File | Depends on | Status |
|---|------|------|------------|--------|
| 40 | Move data model rework (mana_cost → max_uses, mp/maxMp → per-move moveUses) | [40-uses-based-move-data-model.md](40-uses-based-move-data-model.md) | — | **Shipped** |
| 41 | Balance patch: 3-damage + 1-support slot rolling | [41-move-slot-rebalance-3-damage-1-support.md](41-move-slot-rebalance-3-damage-1-support.md) | 40 | **Shipped** |
| 42 | Battle engine: execute moves against uses, not mana | [42-battle-engine-uses-execution.md](42-battle-engine-uses-execution.md) | 40, 41 | Partially done (see step 40's "what actually happened") |
| 43 | Server validation + battle UI: uses instead of mana | [43-uses-ui-and-server-validation.md](43-uses-ui-and-server-validation.md) | 42 | Partially done (see step 40's "what actually happened") |
| 44 | Starter movesets: 3-damage + 1-support, uses-based (trigger + backfill) | [44-starter-moveset-rework.md](44-starter-moveset-rework.md) | 40, 41 | Not started |
| 45 | Balance patch: bot-battle lootbox rate 25% → 60% | [45-bot-battle-lootbox-rate-increase.md](45-bot-battle-lootbox-rate-increase.md) | — | Not started |
| 46 | Backfill: every non-starter owned Pokemon to the new shape | [46-existing-instance-backfill.md](46-existing-instance-backfill.md) | 40, 41 | Not started |
| 47 | Docs pass + roster-wide validation | [47-docs-and-roster-validation.md](47-docs-and-roster-validation.md) | 42, 43, 44, 46 | Not started |

## Why this order

Mostly a dependency chain, with two fully independent steps slotted in
wherever convenient:

- **40 (data model) first** — every later step needs `max_uses`/`moveUses`
  to exist, same role `archive/v4`'s step 21 played for the move-kind
  rework.
- **41 (3/1 slot rebalance) before 42** — the engine step is easiest to
  build and validate against movesets that already reflect the new split,
  rather than retrofitted after. Also before 44/46, which migrate existing
  data *into* the new split.
- **42 (engine) before 43 (UI + server validation)** — nothing to render
  or reject until the engine actually tracks/spends uses. Same ordering
  `archive/v4` used for its engine-then-UI steps (24/25/26 before 28).
- **44 (starters) and 46 (non-starter backfill) both come after 40/41**
  and are independent of each other (different mechanism entirely — one's
  a SQL trigger + targeted backfill, the other's a `rollMoveset()`-based
  backfill) — order between them doesn't matter, split for clarity of
  scope, not sequencing.
- **45 (lootbox rate) has no dependency on anything else in this wave** —
  a single constant in an unrelated route. Placed mid-table because that's
  where it was requested, not because it needs to happen there.
- **47 (docs + roster validation) is last** — a sanity pass across the
  whole wave, only meaningful once data model, engine, UI, starters, and
  backfill all exist. Mirrors `archive/v4`'s step 29 closing role.

## Key decisions made

From the 2026-08-19 planning pass (this file was written before any
implementation — these are the plan's own design calls, not yet validated
live; flag disagreement before step 40 starts):

- **The free-move guarantee is dynamic, not a catalog field.** Because
  `rollMoveset()` draws from shared pools, the same move can be one
  instance's strongest damage move and another's weakest. "Their weakest
  one" is computed at `buildFighterState()` time, per-instance, among that
  instance's `kind: "damage"` moves only (drain moves have `power` too but
  live in the support pool, per the existing DAMAGE_SLOTS/SUPPORT_SLOTS
  split — they're not eligible to be the free move).
- **`max_uses` stays a flat, tiered catalog attribute**, same convention
  `mana_cost` already followed (`archive/v4`'s "no power/cost-scales-with-
  rarity" decision) — a suggested tier table is in step 40's file, framed
  as a tuning starting point, not a locked spec.
- **Starters are explicitly in scope this wave**, reversing `archive/v4`'s
  precedent of leaving them permanently untouched. Checked
  `WelcomeDialog.tsx`'s player-facing "forever" promise directly (step 44):
  it's about starters being untradeable/undiscardable, not about their
  moveset staying fixed, so this doesn't actually break a promise made to
  players.
- **Existing non-starter instances get a minimal-disruption backfill**
  (keep both existing damage moves + one existing support move as-is,
  roll only the newly-added 3rd damage slot, drop one support move by a
  deterministic rule) rather than a full re-roll — same "preserve what's
  already there" spirit as `archive/v4`'s own backfill, extended to a
  different slot count.
- **Online-battle lootbox rate (100%, unconditional) is untouched** — the
  60% change is bot battles only, per the request's own wording.

Surfaced during step 40's actual implementation (not anticipated when this
file was first drafted — see that step's own "what actually happened" for
full detail):

- **Three catalog moves read/wrote the now-deleted mp pool** (`Charge`'s
  `restoreMana`, `Mana Burn`/`Mind Sap`'s `drainMana`, `Mind Siphon`/
  `Energy Drain`'s `resource: "mp"`) and needed resolving as part of the
  type change itself, not deferred to a later step. Each was reassigned to
  an existing effect shape (statUp/statDown/inflictStatus/hp-drain) rather
  than given a new uses-based analog — `BuffEffect`/`DebuffEffect` lost the
  `restoreMana`/`drainMana` variants entirely, `DrainMove.drain.resource` is
  now always `"hp"`.
- **The free-move guarantee must have exactly one source of truth.** A first
  pass mapped the pre-existing `mana_cost: 0` moves (Mud-Slap, Poison Sting,
  Peck, Lick) to a catalog-level `max_uses: null`, which collided with the
  *dynamic* per-instance override on any instance that rolled one of those
  4 alongside a lower-power move — caught by validation (7 species, ~1.3%
  of simulated rolls), fixed by mapping `mana_cost: 0 -> max_uses: 5`
  instead. No catalog move is `null` as of step 40; `null` only ever
  appears dynamically, at `buildFighterState()` time.
- **Compiling the engine/UI after removing mp/mana_cost necessarily
  absorbed small pieces of steps 42/43's own scope** (bot-AI move
  selection, player-facing insufficient-uses checks, uses-text display,
  FighterCard's and AllyTargetPicker's MP meters) — there's no way to leave
  code reading a deleted field in place. `executeMove()`'s actual
  decrement-and-reject logic and the server route's real uses-based
  rejection remain explicitly un-implemented (`TODO`-marked) and are still
  42/43's real remaining work, just a smaller diff than originally scoped.
- **The 85%-own-type weighting doesn't hold uniformly under 3 damage
  slots** (step 41) — it's capped by each type's own damage-pool depth,
  which was already shallow (exactly 2 own-type moves) for 11 of 18 types
  before this step; going from 2 to 3 damage slots exposes that ceiling for
  the first time (~63% observed vs. the nominal 85%), and Dark has 0
  own-type damage moves in the pool at all (true before this step too, not
  caused by it). Pre-existing `rollOneMove()` dedup behavior, not a step-41
  bug — authoring deeper per-type damage pools would fix it but is a
  content decision outside any current step's scope. See step 41's own
  file for the full per-type table.

## Working through a step

1. Read the step's `.md` file in full before starting.
2. Implement it in isolation — don't pull in work from later steps even if
   it seems convenient.
3. Run through the **End state** checklist at the bottom of the step file.
   Every item should be verifiable by hand (`npm run build`, a browser
   check, a Supabase table query, etc.) — if an item can't be checked, the
   step isn't actually done.
4. Any step that writes to production data (44's starter backfill, 46's
   non-starter backfill) needs its own explicit dry-run-then-confirm
   go-ahead from the user before the write runs — not covered by general
   step approval, same process `archive/v4`'s step 29 used.
5. Only move to the next step once its listed dependencies are checked off.
6. Once every step ships, archive this file + the step files to
   `upgrades/archive/v6/` and write a fresh "no active wave" `main.md`.
