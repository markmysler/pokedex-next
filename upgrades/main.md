# Upgrade Path

No active wave.

The fifth wave, **a full visual redesign of every screen** (warm
device-inspired neutrals + Poké Red accent, segmented Game Boy–style
meters, "bezel tab" card headers, a desktop-rail/mobile-bottom-tab nav
shell), shipped in full on 2026-08-19 — see
[archive/v5/main.md](archive/v5/main.md) for the complete 10-step
history, validation notes, and key decisions. It followed
[archive/v4/main.md](archive/v4/main.md) (the attack/move-kind rework, 9
steps, shipped 2026-08-14), which followed
[archive/v3/main.md](archive/v3/main.md) (5 steps), which followed
[archive/v2/main.md](archive/v2/main.md) (15 steps), which followed the
original 8-step plan in [archive/main.md](archive/main.md).

The redesign's own source-of-truth docs live outside `upgrades/` and stay
current going forward, independent of any wave's lifecycle:

- **[design/DESIGN_SYSTEM.md](../design/DESIGN_SYSTEM.md)** — the
  token/component spec (palette, type, spacing, radius, meters, nav,
  battle log) as actually implemented, including the two places
  implementation deviated from the original spec (documented inline).
- **[design/REDESIGN_TRACKER.md](../design/REDESIGN_TRACKER.md)** —
  per-screen status; all 15 screens + 10 shared components read ✅ Done.

## Starting a new wave

When the next batch of work is scoped:

1. Create numbered step files here in `upgrades/` (continue numbering
   from 40), each with: Status, Why here, What changes, and an End state
   checklist — same shape every prior wave used.
2. Rewrite this file to describe the new wave, its step table, "why this
   order," and a running "key decisions made" log — replacing this
   placeholder.
3. Work through steps in order, one at a time: read the step file in
   full, implement it in isolation (don't pull in later steps' scope
   even if convenient), validate against its End state checklist, only
   then move on.
4. Once every step ships, archive this file + the step files to
   `upgrades/archive/v6/` (following this file's own git history for the
   exact pattern) and write a fresh "no active wave" `main.md` — same as
   this one.
