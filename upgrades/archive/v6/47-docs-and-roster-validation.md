# Step 47: Docs pass + roster-wide validation

**Status: shipped.** Last step of the wave — see `main.md`'s "The
mana-to-uses migration" section for the full context and dependency chain.

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

## What actually happened

**Docs sweep**: grepped the whole repo (case-insensitive, `mana_cost|
maxMp|\bMP\b|mana pool|mana cost|\bmana\b`), excluding archived `upgrades/`
step files and `supabase/migrations/*.sql` (append-only history, exempt
same as archived steps). Most matches across `lib/battleEngine.ts`,
`components/battle/*.tsx`, `types/pokemon.ts`, `lib/data/movePool.ts`,
`design/DESIGN_SYSTEM.md`/`REDESIGN_TRACKER.md` were already correctly
past-tense ("the old mana pool", "MP meter removed", etc.) from steps
40/43's own sweeps — left untouched. Found and fixed 5 that genuinely
described current behavior incorrectly:

- `lib/battleEngine.ts`: `resolveTeamRound`'s own doc comment still said
  it mutates "HP/MP" — corrected to "HP/moveUses".
- `types/pokemon.ts`: `TeamState`'s comment said members "keep their
  HP/MP across switches"; `FighterState`'s status-effect comment said
  state resets "exactly like hp/mp" — both corrected to `moveUses`.
- `app/layout.tsx`: the page's actual `<meta name="description">` text
  (real, user/SEO-facing, not a code comment) still read "Kanto Pokedex
  with a mana-based battle arena" — corrected to "a per-move uses battle
  arena".
- `app/globals.css` (2 spots) and `components/ui/SegmentedMeter.tsx` (1
  spot): comments describing `SegmentedMeter`'s use cases as "HP/MP" or
  "battle HP/MP bars" as if an MP meter still exists in some form today
  — corrected to say HP only, with an explicit note that the MP row was
  retired entirely (not just restyled) in step 40, since these comments'
  original wording could read as MP still existing via a different
  component.
- `CLAUDE.md`/`AGENTS.md`: no battle-system-specific content in either
  (both are just the generic Next.js-version-warning boilerplate) — no
  update needed there.

**Roster-wide roll validation**: 1,667 total `rollMoveset()` rolls — 18
synthetic mono-type species × 60 rolls (guarantees direct coverage of
every one of the 18 types as a primary type) + all 67 real dual-type
species × 5 rolls + all 84 real mono-type species × 3 rolls. Every roll
checked for: exactly 3 damage + 1 support, every move's `max_uses` a
positive number or `null`, and — via the real `buildFighterState()` —
exactly one `moveUses` entry `null` and it's always the lowest-power
damage move. 0 failures across all 1,667.

**Battle-exhaustion validation**: 200 1v1 local battles, 80 3v3 "vs-bot-
shaped" battles, and 80 3v3 "online-shaped" battles (both 3v3 batches use
the same real `resolveTeamRound()` the actual online room route calls —
the engine doesn't distinguish who controls a side, so this is a
meaningful stand-in for both modes named in the plan), all against
freshly `rollInstance()`-rolled Pokemon, run to natural battle-end with a
"never select a depleted move" invariant checked every single turn (0
violations across all three batches). Genuine mid-battle exhaustion
confirmed in all three: 108/200 1v1 battles, 140 team-member-battles in
the vs-bot-shaped batch, 145 in the online-shaped batch had at least one
limited-use move actually hit 0. The free move never hit 0 in any of the
360 total battles. 0 crashes anywhere.

**Starter + non-starter real-data regression**: fetched all 21 starter
rows and all 48 non-starter rows directly from production (not simulated)
— confirmed all 69 are on the correct 3-damage+1-support/`max_uses` shape
with 0 failures — then ran 15 mixed starter-vs-non-starter 1v1 battles
plus one mixed 3v3 (2 starters + 1 non-starter vs. 1 starter + 2
non-starters) through the real engine. 0 crashes, 9/15 1v1 pairings
exhausted a move genuinely, free move never depleted in any of them.

**Known limitation, same as step 43's**: this is a CLI-only environment
with no browser, so the plan's own "confirmed playable ... via a real
browser battle, not just a script" item literally cannot be performed
here. Substituted with the real-data regression above (actual production
rows, actual shipped engine functions, not a reimplementation) — the
closest verification achievable without a GUI. A manual browser pass
before/alongside real player traffic is still worth doing, same caveat
step 43 already carries.

## End state

- [x] No remaining reference to `mana_cost`/mana/MP describing current
      behavior anywhere in `design/`, `CLAUDE.md`, or non-archived source
      comments (archived `upgrades/` step files are historical and exempt).
      (5 stale spots found and fixed — see "What actually happened".)
- [x] 1,000+ simulated rolls across all 18 types confirm the 3-damage/
      1-support guarantee and the exactly-one-free-move guarantee hold
      with zero exceptions. (1,667 rolls, 0 failures.)
- [x] Several full battles played long enough to exhaust a limited-use
      move mid-battle, with no crash and correct move-availability
      behavior throughout. (360 battles across 1v1/3v3-vs-bot-shaped/
      3v3-online-shaped, 0 crashes, genuine exhaustion confirmed in all
      three batches.)
- [x] Migrated starter and backfilled non-starter instances confirmed
      playable end-to-end via a real browser battle, not just a script.
      **Partially met**: no browser exists in this environment (same
      limitation step 43 documented); substituted with a real-production-
      data regression (all 69 current rows, real engine functions) —
      see "What actually happened" and "Known limitation" above. A true
      browser pass is still outstanding.
- [x] `upgrades/main.md` updated to mark every step in this wave shipped
      (or explicitly note anything deferred/skipped and why).
- [x] `npm run build` / `npm run lint` clean.
