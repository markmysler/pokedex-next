# Step 44: Starter movesets — 3 damage + 1 support, uses-based

**Status: not started.** See `main.md`'s "The mana-to-uses migration"
section for the full context and dependency chain, and the "Starters are
in scope this time" key decision.

## Why here

Depends on steps 40/41 (needs `max_uses` and the 3/1 convention to migrate
*into*) and benefits from 42/43 existing so the new starter kits can
actually be battle-tested, not just inserted. Kept as its own step because
starters are hand-authored SQL, not `rollMoveset()` output — a completely
different mechanism from every other Pokemon in the game, same reason
`archive/v4/29-existing-instance-policy-and-validation.md` treated them as
a special case (there, to explicitly exclude them; here, to explicitly
include them per this wave's own instruction).

## Why here (product note)

`archive/v4/main.md`'s key decision explicitly *excluded* starters from
that wave's backfill ("fixed/permanent by design ... explicitly promised to
players as permanent in `WelcomeDialog.tsx`"). This wave's instruction is
that **all existing Pokemon are affected, with no carve-out** — that
supersedes the prior precedent specifically for this migration.

Checked `components/onboarding/WelcomeDialog.tsx`'s current copy directly:
the "forever" promise it makes (line 30, `"forever: starters can never be
discarded or traded away"`) is about ownership — starters can't be released
or traded — not about their moveset staying fixed. Rewriting a starter's
moves doesn't contradict that copy, so no player-facing promise actually
blocks this step; no copy change needed here.

## What changes

### Today's starter kits (all 4 damage, 0 support)

Defined twice: `handle_new_user()`'s hardcoded JSON in
`supabase/migrations/20260808060000_signup_lootbox.sql` (as last redefined
by `20260814000000_starter_move_kind_fix.sql`), and — for every account
that signed up before this migration — literally stored that way in
`pokemon_instances` rows with `is_starter = true`.

| Starter | Current 4 moves (all damage) |
|---|---|
| Charmander (`004`) | Scratch, Ember, Flamethrower, Fire Blast |
| Squirtle (`007`) | Tackle, Water Gun, Bubble Beam, Hydro Pump |
| Bulbasaur (`001`) | Tackle, Vine Whip, Razor Leaf, Solar Beam |

### New starter kits (3 damage + 1 support, uses-based)

For each starter, drop the weakest-*surviving* damage move (i.e. keep the
lowest-power one as the guaranteed-free attack, keep the two strongest as
the other two damage slots) and add one type-flavored support move,
hand-picked from `lib/data/movePool.ts`'s existing pools (consistent with
"starters are hand-authored, not rolled" staying true post-migration —
this step is choosing *which* support move by hand, the same way the
original 4 damage moves were hand-picked, not by running `rollMoveset()`
against a starter). Suggested pick (own-type, matches `rollMoveset()`'s own
type-flavoring bias — confirm/adjust during implementation):

| Starter | Kept damage moves (free one bolded) | Dropped | Added support |
|---|---|---|---|
| Charmander | **Scratch**, Flamethrower, Fire Blast | Ember | Inferno Curse (Fire debuff) or a Fire-flavored buff if preferred |
| Squirtle | **Tackle**, Bubble Beam, Hydro Pump | Water Gun | Barrier (Psychic-pool shield) or a Water-flavored pick if one exists — check pool for a better type match first |
| Bulbasaur | **Tackle**, Razor Leaf, Solar Beam | Vine Whip | Cotton Guard (Grass buff) |

(Exact picks are this step's implementation-time call — the table above is
a starting proposal, not a locked spec. `max_uses` on all 4 comes from
whatever the move already carries post-step-41's rescale; the kept damage
move with the lowest `power` gets treated as unlimited per step 40/42's
free-move rule automatically, no special-casing needed for starters beyond
picking which one to keep.)

### `handle_new_user()` (new migration, e.g.
`supabase/migrations/<timestamp>_starter_uses_rebalance.sql`)

Redefine the function with the new 4-move JSON per starter (now including
`max_uses` instead of `mana_cost`, and the new support move) — same
`create or replace function` pattern the existing migrations already use.

### Backfill for already-granted starters

Same migration file, second statement: update every `pokemon_instances` row
where `is_starter = true`, replacing its `moves` jsonb with the new 4-move
kit for its species (matched by `pokemon_number`). Every existing starter
of a given species gets the *identical* new kit (no per-instance rolling,
same as how they were all identical before this migration) — a `case
pokemon_number when '004' then '[...]'::jsonb when ... end` update, or three
separate scoped `update ... where pokemon_number = '...'`, whichever reads
cleaner.

## What does NOT change in this step

- Non-starter instances — step 46.
- The lootbox-grant-on-signup mechanic itself (`insert into lootboxes`) —
  untouched, only the `pokemon_instances` insert values change.

## End state

- [ ] `handle_new_user()` grants each starter with 3 damage + 1 support
      moves, all carrying `max_uses` (no `mana_cost` field remains
      anywhere in the function body).
- [ ] A dry-run query against production (read-only, via the service key)
      counts exactly how many existing `pokemon_instances` rows have
      `is_starter = true`, broken down by `pokemon_number` — presented to
      the user before the backfill statement runs for real, same
      dry-run-then-confirm process `archive/v4/29-...md` used.
- [ ] Backfill applied; a follow-up read confirms 0 starter rows remain on
      the old 4-damage/0-support, mana_cost-keyed shape.
- [ ] A fresh signup (new test account, deleted after) receives the new
      starter kit correctly from `handle_new_user()`.
- [ ] `npm run build` / `npm run lint` clean.
