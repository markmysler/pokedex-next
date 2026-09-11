# Step 47: Docs pass + roster-wide validation

**Status: not started.** See `main.md`'s "The mana-to-uses migration"
section for the full context and dependency chain.

## Why here

Last step — a sanity pass across the whole wave, only meaningful once
everything else (data model, engine, UI, starters, backfill, lootbox rate)
actually exists. Mirrors `archive/v4/29-...md`'s validation half (that step
combined the existing-instance policy decision with a roster-wide roll
validation; this wave split those into 46 and 47 since the policy decision
was already made up front for this wave, unlike v4's).

## What changes

### Documentation

- Grep the whole repo for `mana_cost`, `mana`, `MP`, `maxMp` outside of
  git history/archived `upgrades/` step files (archived steps are historical
  record, left as-is) — anywhere still describing the old system needs
  updating: `design/DESIGN_SYSTEM.md`, `design/REDESIGN_TRACKER.md`,
  `CLAUDE.md` if it mentions the battle system, any inline comment in
  `lib/battleEngine.ts` or elsewhere that explains mana mechanics no longer
  in the code (e.g. the `damageLogLine` comment referencing "MP" if not
  already caught in step 43).
- `upgrades/main.md` rewritten to reflect every step's shipped status (or
  explicitly-skipped status, if anything in this wave ends up deferred),
  same as every prior wave's closing step did.

### Roster-wide validation (throwaway script, scratchpad, not committed)

- Roll 1,000+ fresh instances across all 18 types (mono + dual) via
  `rollInstance()`/`rollMoveset()`, confirm: exactly 3 damage + 1 support
  every time, every move carries a valid `max_uses` (a positive number or
  `null`), and exactly one damage move per instance ends up with
  `moveUses[i] === null` at `buildFighterState()` time (never zero, never
  more than one).
- Play a batch of full battles (1v1 local, 3v3 vs-bot, 3v3 online-shaped)
  long enough that at least one limited-use move genuinely exhausts mid-
  battle for some participant, confirming: the exhausted move becomes
  unselectable, every other move (especially the free one) remains
  selectable, and no runtime error occurs — same technique
  `archive/v4/29-...md` used, extended to actually run a battle long
  enough to hit 0 uses on something rather than just checking initial
  state.
- Confirm the migrated starter kits (step 44) and backfilled non-starter
  instances (step 46) both play correctly end-to-end in a real (not
  simulated) battle via the browser — a final regression pass across old
  data, not just newly-rolled data.

## What does NOT change in this step

Nothing new is built here — this is verification + documentation only. If
it surfaces a bug, fix it in the step whose scope it belongs to (or as a
small fix noted in this step's "What actually happened," same pattern
`20260814000000_starter_move_kind_fix.sql` used for a bug found late in
v4's own validation pass) rather than expanding this step's own scope.

## End state

- [ ] No remaining reference to `mana_cost`/mana/MP describing current
      behavior anywhere in `design/`, `CLAUDE.md`, or non-archived source
      comments (archived `upgrades/` step files are historical and exempt).
- [ ] 1,000+ simulated rolls across all 18 types confirm the 3-damage/
      1-support guarantee and the exactly-one-free-move guarantee hold
      with zero exceptions.
- [ ] Several full battles played long enough to exhaust a limited-use
      move mid-battle, with no crash and correct move-availability
      behavior throughout.
- [ ] Migrated starter and backfilled non-starter instances confirmed
      playable end-to-end via a real browser battle, not just a script.
- [ ] `upgrades/main.md` updated to mark every step in this wave shipped
      (or explicitly note anything deferred/skipped and why).
- [ ] `npm run build` / `npm run lint` clean.
