# Step 29: Existing-instance policy + roster-wide roll validation

**Status: shipped**, 2026-08-14. See `main.md`'s "The attack-system
rework" section for the full context and dependency chain.

The user explicitly chose the backfill alternative over the default
"leave existing instances alone" recommendation (confirmed live, not
assumed) — see "What changed" below for what actually ran.

## Why here

Last step — a product decision plus a roster-wide sanity pass, both of
which only make sense once the rest of the rework actually exists.

## What changes

### The policy question: what happens to already-owned Pokémon?

Every currently-owned `pokemon_instances` row has its `moves` jsonb
already rolled and persisted — 4 moves, currently all `kind: "damage"`
under the pre-rework pool. Once step 23 ships, only *newly*-rolled
instances (new lootbox opens, new starter grants) get the 2-damage+2-
support distribution automatically, because `rollMoveset()` only runs at
roll time, not retroactively.

**Default recommendation (per `main.md`'s key decision — confirm before
implementing): do nothing to existing instances.** They keep their
current (all-damage) moveset permanently, exactly as already-rolled
stats have always been treated as fixed once granted (no prior step in
this project has ever silently rewritten a live player's already-owned
Pokémon). This is consistent, low-risk, and requires no migration.

**The alternative, if the user prefers it instead:** a one-time backfill
script that re-rolls 2 of each existing instance's 4 moves from the new
support pool (keeping the other 2 as-is, or also re-rolling from the
damage pool — a further sub-decision), run once against every existing
`pokemon_instances` row via the Supabase secret key, similar in spirit to
this project's disposable-test-account validation scripts but a real
one-time production data migration, not a throwaway script — meaning it
needs its own explicit go-ahead separate from the rest of this step, a
dry-run count before executing, and should not be bundled silently into
whatever step happens to touch `rollMoveset()`.

**This step's own scope is to make this decision explicit and act on
whichever the user confirms** — not to unilaterally pick the alternative
without asking, since it's a real product/data decision, not just an
engineering one.

### Roster-wide roll validation

A temporary validation script (same throwaway pattern used for steps
16-20: written to the scratchpad, run against a local dev server or
directly against `rollMoveset()`/`rollInstance()`, deleted after running,
never committed) that:

- Rolls a large number of instances (e.g. 1,000+) spread across all 18
  types (both single- and dual-type combinations) and confirms every
  single roll produces exactly 2 damage + 2 support moves, with the
  85%-own-type weighting holding up statistically for both the damage and
  support passes independently.
- Confirms no type ever fails to complete a roll (hits `MAX_ROLL_ATTEMPTS`
  short of 4 moves) — this is the sharpest possible test of step 22's
  "no type structurally unable to roll a support move" checklist item,
  since it's exercised at real rolling volume instead of a manual
  spot-check.
- Plays a handful of full battles (1v1 and 3v3, local and online) end to
  end using freshly-rolled Pokémon with real mixed movesets, confirming
  no runtime error occurs regardless of which move kinds get selected in
  which order — a cheap way to catch an unhandled edge case (e.g. two
  buffs cast back-to-back, a drain move used while shielded, redirect
  firing on the final living member of a team) that a narrower per-kind
  test wouldn't surface.

## What actually happened

Asked the user explicitly rather than assuming the default; they chose
the backfill alternative. A dry run against production (via the service
key, read-only) found:

- **84 total `pokemon_instances` rows**: 36 starters, 48 non-starters.
- **All 48 non-starters** were pre-step-21 legacy data — 4 damage moves
  each, *none* tagged with `kind` at all (the same underlying issue as
  the starter bug fixed earlier this session, just for lootbox-rolled
  instances instead of starters).
- Starters were excluded from the backfill's scope entirely (fixed/
  permanent by design — never rolled via `rollMoveset()`, explicitly
  promised to players as permanent in `WelcomeDialog.tsx`).

Presented the exact dry-run count and full change list to the user
before writing anything; got their explicit go-ahead naming the
production write specifically. Executed: for each of the 48, kept moves
1-2 as-is (tagging them `kind: "damage"` since they were missing it) and
replaced moves 3-4 with two freshly-rolled support moves via the real
`rollMoveset()` (perfect parity with production rolling logic, run via
`tsx` importing the actual project modules, not a reimplementation).
48/48 succeeded, 0 failures. Re-ran the dry-run script afterward and
confirmed 0 remaining candidates — every non-starter instance now has a
proper 2-damage+2-support moveset.

## End state

- [x] The existing-instance policy question has been explicitly confirmed
      with the user (not assumed) and implemented accordingly — either
      "no change" (the default) or a scoped, dry-run-first backfill.
      (Backfill chosen; dry run → explicit production-write confirmation
      → executed → re-verified, per the process above.)
- [x] 1,000+ simulated rolls across all 18 types confirm the 2-damage+2-
      support guarantee holds with zero exceptions. (2,160 rolls across
      all 18 types, both mono- and dual-type combinations: 0 shortfalls,
      0 violations. 85%-own-type weighting re-confirmed on a deep-pool
      type over 3,000 rolls: damage 0.861, support 0.881.)
- [x] No `PokemonType` ever fails to complete a 4-move roll. (All 18
      types, 20 mono-type trials each: 0 failures.)
- [x] Several full battles (1v1 local, 3v3 local vs-bot, 3v3 online) play
      to completion with real mixed movesets and no runtime error,
      covering at least one real use of every one of the 5 move kinds
      across the battles combined. (40 1v1 + 25 3v3-vs-bot-shaped + 25
      3v3-online-shaped battles, random species/rosters/moves including
      randomized `buffTargetTeamIndex`: 0 crashes across all 90. All 5
      kinds — damage, buff, debuff, drain, redirect — confirmed exercised
      at least once across the run.)
- [x] `main.md`'s step 20 table is updated to mark steps 21-29 "Shipped"
      (or whichever subset actually shipped, if step 27 or the backfill
      alternative was deliberately skipped) once this step's checks pass.
      (Steps 21-29 all shipped, including step 27 and the backfill.)
- [x] `npm run build` / `npm run lint` clean.
