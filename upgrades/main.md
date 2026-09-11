# Upgrade Path

No active wave.

The sixth wave, **the mana-to-uses migration**, shipped in full on
2026-09-11 — see [archive/v6/main.md](archive/v6/main.md) for the
complete 8-step history, validation notes, and key decisions. Replaced
the old shared, regenerating `mp`/`maxMp` pool with a per-move,
per-battle uses cap (`max_uses`), guaranteed every Pokemon a freely
castable weakest damage move, rebalanced every move slot from
2-damage+2-support to 3-damage+1-support (rolled instances, starters, and
every already-owned Pokemon alike — no carve-out), and raised the
bot-battle lootbox drop rate from 25% to 60%. It followed
[archive/v5/main.md](archive/v5/main.md) (the full visual redesign, 10
steps, shipped 2026-08-19), which followed
[archive/v4/main.md](archive/v4/main.md) (the attack/move-kind rework, 9
steps, shipped 2026-08-14), which followed
[archive/v3/main.md](archive/v3/main.md) (5 steps), which followed
[archive/v2/main.md](archive/v2/main.md) (15 steps), which followed the
original 8-step plan in [archive/main.md](archive/main.md).

Two real bugs were found and fixed along the way, neither part of the
wave's original scope:

- A pre-existing `resolveTeamRound` softlock on simultaneous double-faint
  (fixed same-day, 2026-09-11, standalone from the wave's own step
  numbering) — see [archive/v6/43-uses-ui-and-server-validation.md](archive/v6/43-uses-ui-and-server-validation.md).
- Stale pre-migration effect data (`restoreMana`/`drainMana`/
  `resource: "mp"`) left behind in already-owned Pokemon that had rolled
  one of the 5 catalog moves reassigned during the migration — caught and
  fixed by the non-starter backfill's own rescale mechanism — see
  [archive/v6/46-existing-instance-backfill.md](archive/v6/46-existing-instance-backfill.md).

One item from the wave's own validation plan remains genuinely
unverified: a real browser battle pass (this is a CLI-only environment
with no GUI) — see [archive/v6/47-docs-and-roster-validation.md](archive/v6/47-docs-and-roster-validation.md)'s
"Known limitation" for what was substituted instead. Worth a manual pass
before/alongside real player traffic.

The redesign's own source-of-truth docs live outside `upgrades/` and stay
current going forward, independent of any wave's lifecycle:

- **[design/DESIGN_SYSTEM.md](../design/DESIGN_SYSTEM.md)** — the
  token/component spec (palette, type, spacing, radius, meters, nav,
  battle log) as actually implemented, including the one remaining place
  implementation deviates from the original spec (documented inline).
- **[design/REDESIGN_TRACKER.md](../design/REDESIGN_TRACKER.md)** —
  per-screen status; all 15 screens + 10 shared components read ✅ Done.

## Starting a new wave

When the next batch of work is scoped:

1. Create numbered step files here in `upgrades/` (continue numbering
   from 48), each with: Status, Why here, What changes, and an End state
   checklist — same shape every prior wave used.
2. Rewrite this file to describe the new wave, its step table, "why this
   order," and a running "key decisions made" log — replacing this
   placeholder.
3. Work through steps in order, one at a time: read the step file in
   full, implement it in isolation (don't pull in later steps' scope
   even if convenient), validate against its End state checklist, only
   then move on.
4. Once every step ships, archive this file + the step files to
   `upgrades/archive/v7/` (following this file's own git history for the
   exact pattern) and write a fresh "no active wave" `main.md` — same as
   this one.
