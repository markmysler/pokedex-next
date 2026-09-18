# Step 58: Docs pass + roster-wide validation

**Status: planned.** See `main.md`'s "Evolution, Psychic counterplay, and
bilingual support" section for the full context and dependency chain.

## Why here

Last step of the wave — a sanity pass across everything, only meaningful
once evolution, the new species, and every i18n content cluster all exist.
Mirrors `archive/v6/47-docs-and-roster-validation.md`'s closing role for the
prior wave.

## What changes

### Docs sweep

- `README.md`: the "all 151 Kanto species" line needs updating to reflect
  the 6 added Dark-type-line species (157 total) — decide the exact
  phrasing (e.g. "151 Kanto species plus 6 Dark-type additions for Psychic
  counterplay") rather than silently changing the number with no
  explanation, since the original framing was a deliberate identity choice
  this wave explicitly broke. Also add Evolution and the language toggle to
  the README's feature list, same as every prior wave's shipped features
  got documented there.
- `design/DESIGN_SYSTEM.md`/`design/REDESIGN_TRACKER.md`: add the Evolve UI
  and language toggle to whichever component/screen entries they touch, if
  those docs are meant to stay current independent of wave lifecycle (per
  `upgrades/archive/v6/main.md`'s own note that these docs "stay current
  going forward, independent of any wave's lifecycle").
- Sweep for stale references the same way step 45/47 did last wave (that
  pass found 5+ stale mana/MP mentions after 3 prior steps had already
  "finished" cleaning up) — search comments and user-facing strings for
  anything still assuming exactly 151 species, no evolution, or
  English-only.
- Worth a one-line note in `main.md`'s own history (not a new step) that a
  same-type-attack-bonus mechanic was proposed, analyzed, and explicitly
  rejected during this wave's planning — so a future reader doesn't
  rediscover the same idea without the reasoning already worked out (the
  full analysis lives in `main.md`'s key decisions and the git history of
  this file's own earlier draft).

### Roster-wide validation

- **Evolution**: simulate evolving every species with a non-null
  `evolvesInto` (including Eevee's 4-way branch — 3 at step 48, growing to
  4 once step 52 appends Umbreon — checked for roughly-even distribution
  over many trials) and confirm the derived-stat formula produces sane
  results across the whole roster, not just the species spot-checked in
  step 49.
- **Psychic counterplay**: confirm Umbreon/Houndoom/Tyranitar are actually
  immune to Psychic-type damage in a real simulated battle against Mewtwo,
  and that their own-type damage pool isn't starved (i.e. they do actually
  roll a Dark move at roughly the expected 85% rate) now that step 52's new
  Dark damage moves exist.
- **i18n**: a full pass over both locales confirming no leftover hardcoded
  English (or Spanish) string anywhere in the app — this is the one item
  most likely to need genuine manual/visual checking rather than a script,
  given how much of it is prose; call out explicitly (same honesty
  standard `archive/v6/main.md` held itself to for its own unverifiable
  browser-battle item) whatever this environment can't actually verify
  without a GUI, rather than marking it done regardless.

## End state

- [ ] README, `design/DESIGN_SYSTEM.md`, `design/REDESIGN_TRACKER.md`
      updated to reflect this wave's shipped features, with no stale
      "151 species"/pre-evolution/English-only claims left.
- [ ] Evolution validated across the full roster (every non-null
      `evolvesInto`, including Eevee's 4-way branch distribution).
- [ ] Umbreon/Houndoom/Tyranitar's counter-play validated directly against
      Mewtwo in simulation, including their own-type Dark damage move roll
      rate.
- [ ] i18n validated as thoroughly as this environment allows, with any
      genuinely-unverifiable item (e.g. a real browser pass, same caveat as
      last wave) called out explicitly rather than silently assumed done.
- [ ] `npm run build` / `npm run lint` clean across the whole diff.
- [ ] Wave archived: this file + steps 48-58 + `main.md` move to
      `upgrades/archive/v7/`, and a fresh "no active wave" `main.md` is
      written, per the process every prior wave has followed.
