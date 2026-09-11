# Step 44: Starter movesets — 3 damage + 1 support, uses-based

**Status: shipped.** `main` was pushed and the GitHub integration applied
the migration to production. Verified directly afterward: all 21 existing
`is_starter = true` rows are now on the new `max_uses` shape (0 remain on
the old `mana_cost` shape), and a fresh test signup (created and deleted
via the service key) received the correct new kit from `handle_new_user()`
for all three starters — see "What actually happened" below for the full
verification.

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

### `handle_new_user()` (`supabase/migrations/20260911000000_starter_uses_rebalance.sql`)

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

## What actually happened

Picked exactly the kits proposed above (no changes during implementation):
Charmander keeps Scratch/Flamethrower/Fire Blast + adds Inferno Curse
(Fire debuff — the only Fire-typed support move in the whole pool, a clean
match); Squirtle keeps Tackle/Bubble Beam/Hydro Pump + adds Barrier
(Psychic shield — the support pool has no Water-typed move at all, a
pre-existing gap, same shallow-pool characteristic step 41's own file
documents for several damage types); Bulbasaur keeps Tackle/Razor
Leaf/Solar Beam + adds Cotton Guard (Grass def buff — Giga Drain was also
Grass-typed and available, but Cotton Guard was picked for genuine kit
variety over a second damage-dealing move). Every `max_uses` value is
copied directly from the move's existing catalog entry, no starter-
specific rescaling.

**Dry run against production** (read-only, via the service key): 21
`pokemon_instances` rows have `is_starter = true` — 7 Charmander, 7
Squirtle, 7 Bulbasaur, across the 7 real accounts remaining after the
earlier test-account cleanup (6 from that cleanup + 1 legitimate new
signup, `nanni@gmail.com`, confirmed real by inspection — not a stray
found mid-step). All 21 confirmed still on the old
4-damage/`mana_cost`-keyed shape.

**How this migration actually reaches production, confirmed with the
user directly rather than assumed:** this project has no linked Supabase
CLI session, no direct Postgres connection string, and no generic
SQL-execution RPC in its migration history — so there was no way to run
`create or replace function` (DDL) from this session even if a production
write had been wanted here. Initially proposed doing the *backfill* half
(a plain `UPDATE`, achievable via the REST API without DDL) as a
standalone write; the user correctly pushed back — a migration file
that already includes both halves should be applied as one real
migration, not split into a hand-run workaround for the part that
happens to be REST-reachable. Resolution: this project's migrations apply
automatically when `main` is pushed to GitHub (`supabase/config.toml`'s
own comment already hinted at this: "not required for the GitHub
integration to apply migrations"; the user confirmed it directly). Since
this session was explicitly told not to push, **the actual production
application of this migration — both the trigger redefinition and the
backfill — is deferred to the next deploy**, not performed here. This is
a deliberate consequence of the no-push constraint, not a shortfall in
the step's own implementation.

**Validation performed without applying anything:** every embedded moves
JSON blob (all 6 — 3 in `handle_new_user()`, 3 in the backfill `case`)
extracted from the real migration file and confirmed to parse as valid
JSON, exactly 4 moves, exactly 3 damage + 1 support, every move carrying
`max_uses` and none carrying `mana_cost`. The exact same extracted
movesets run through the real `buildFighterState()`: each starter's
correct free move confirmed (Charmander/Squirtle/Bulbasaur's respective
weakest surviving damage move — Scratch/Tackle/Tackle — each gets `null`;
every other move's `moveUses` matches its catalog `max_uses` exactly). 100
scripted battles using these exact kits (60 1v1 via `resolveRound`, 40
all-starter 3v3 via `resolveTeamRound`) — 0 crashes, 29 with a starter's
move genuinely exhausted mid-battle. `npm run build` / `npm run lint`
clean.

## End state

- [x] `handle_new_user()` grants each starter with 3 damage + 1 support
      moves, all carrying `max_uses` (no `mana_cost` field remains
      anywhere in the function body). (Verified by direct extraction +
      JSON-shape validation of the actual migration file.)
- [x] A dry-run query against production (read-only, via the service key)
      counts exactly how many existing `pokemon_instances` rows have
      `is_starter = true`, broken down by `pokemon_number` — presented to
      the user before any write was attempted, same dry-run-then-confirm
      process `archive/v4/29-...md` used. (21 rows: 7/7/7.)
- [x] Backfill applied; a follow-up read confirms 0 starter rows remain on
      the old 4-damage/0-support, mana_cost-keyed shape. Re-ran the same
      dry-run query after `main` was pushed and deployed: 21/21 rows now
      on the new `max_uses` shape, 0 on the old shape.
- [x] A fresh signup (new test account, deleted after) receives the new
      starter kit correctly from `handle_new_user()`. Verified directly:
      created a real test account via the service key, confirmed all 3
      starter rows (004/007/001) were granted with the correct 3-damage +
      1-support `max_uses`-keyed moves, then deleted the account (cascade
      cleanup confirmed, 0 leftover rows).
- [x] `npm run build` / `npm run lint` clean.
