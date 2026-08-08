# Step 29: Existing-instance policy + roster-wide roll validation

**Status: planning only — not implemented.** Do not start this step
without an explicit go-ahead; see `main.md`'s "The attack-system rework"
section for the full context and dependency chain. Depends on steps 23,
24, 25, 26, and 28 (needs the whole system built to validate against and
to make an informed final call on the policy question below).

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

## End state

- [ ] The existing-instance policy question has been explicitly confirmed
      with the user (not assumed) and implemented accordingly — either
      "no change" (the default) or a scoped, dry-run-first backfill.
- [ ] 1,000+ simulated rolls across all 18 types confirm the 2-damage+2-
      support guarantee holds with zero exceptions.
- [ ] No `PokemonType` ever fails to complete a 4-move roll.
- [ ] Several full battles (1v1 local, 3v3 local vs-bot, 3v3 online) play
      to completion with real mixed movesets and no runtime error,
      covering at least one real use of every one of the 5 move kinds
      across the battles combined.
- [ ] `main.md`'s step 20 table is updated to mark steps 21-29 "Shipped"
      (or whichever subset actually shipped, if step 27 or the backfill
      alternative was deliberately skipped) once this step's checks pass.
- [ ] `npm run build` / `npm run lint` clean.
