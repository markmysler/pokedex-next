# Step 58: Docs pass + roster-wide validation

**Status: Shipped.** See `main.md`'s "Evolution, Psychic counterplay, and
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

- [x] README, `design/DESIGN_SYSTEM.md`, `design/REDESIGN_TRACKER.md`
      updated to reflect this wave's shipped features, with no stale
      "151 species"/pre-evolution/English-only claims left.
- [x] Evolution validated across the full roster (every non-null
      `evolvesInto`, including Eevee's 4-way branch distribution).
- [x] Umbreon/Houndoom/Tyranitar's counter-play validated directly against
      Mewtwo in simulation, including their own-type Dark damage move roll
      rate.
- [x] i18n validated as thoroughly as this environment allows, with any
      genuinely-unverifiable item (e.g. a real browser pass, same caveat as
      last wave) called out explicitly rather than silently assumed done.
- [x] `npm run build` / `npm run lint` clean across the whole diff.
- [x] Wave archived: this file + steps 48-58 + `main.md` move to
      `upgrades/archive/v7/`, and a fresh "no active wave" `main.md` is
      written, per the process every prior wave has followed.

## What actually happened

### Docs sweep

- **README.md**: the "all 151 Kanto species" framing became "the 151 Kanto
  species plus 6 Dark-type additions for Psychic counterplay" (157 total)
  in both the intro paragraph and the Pokédex feature bullet, naming the 3
  lines explicitly rather than just changing the number silently. Added
  Evolution (with a one-line mechanic summary) and a Bilingual bullet to
  the features list. Also found and fixed a second stale spot not called
  out by the plan itself: the "Project structure" tree still showed
  `app/(app)/`/`app/login/` with no `[lang]` segment at all (pre-step-53
  routing) -- corrected, and added the new `lib/i18n/` entry.
- **`design/REDESIGN_TRACKER.md`**: per its own inherited note (`archive/
  v6/main.md`) that it "stays current going forward, independent of any
  wave's lifecycle," added inline notes to the Inventory screen row
  (Evolve button/dialog) and the App shell component row (language
  toggle), plus a "Since this wave" addendum in the Status section
  covering the `app/[lang]/` route-prefix change -- explicitly framed as
  an addendum, not a re-audit: neither this wave nor v6 re-verified every
  screen against the original mockups, so route cells were left at their
  pre-`[lang]` path for readability rather than rewritten as if re-checked.
  `design/DESIGN_SYSTEM.md` needed no changes -- it's tokens/component
  specs, and neither Evolution nor the language toggle introduced a new
  token or visual pattern (Evolve reuses Trade Up's exact button/dialog
  treatment, the language toggle reuses the Sound toggle's row).
- **Stale-reference sweep**: grepped for `151`, English-only/no-evolution
  assumptions, and anything else describing pre-wave behavior as current.
  Found and removed one genuine piece of dead code predating this wave
  entirely: `lib/typeData.ts`'s `getManaCost()`, a leftover from the
  pre-v6 mana system with zero remaining call sites anywhere in the repo
  (v6's own step 47 sweep evidently missed it, same as this step's whole
  reason for existing per its "Why here"). `app/[lang]/layout.tsx`'s
  `<meta name="description">` (real SEO-facing text, the same category
  step 47 fixed for its own stale mana mention) still described
  pre-evolution, English-only behavior -- updated to mention both. Left
  it as a static, non-per-locale string by design (it's a plain `metadata`
  export, not a per-request `generateMetadata()`, and no i18n step scoped
  localizing `<meta>` tags) -- documented inline rather than silently
  leaving it English with no explanation. The "no evolution"/"can't
  evolve" strings found elsewhere (`app/api/inventory/evolve/route.ts`,
  the dictionary's own `startersCantEvolve`/`noEvolutionForSpecies` keys)
  are all live, correct per-Pokemon evolution-availability messages, not
  stale claims that evolution doesn't exist -- left untouched.
- **STAB rejection note**: already fully documented in `main.md`'s own
  "Key decisions made" (written during planning, before step 48 started)
  -- no separate note needed; it's preserved as-is through the archive.

### Roster-wide validation

Ran via a throwaway `tsx` script (project root, deleted after use, per
this step's own "What does NOT change" note) exercising the real
`lib/evolution.ts`, `lib/collection.ts`, `lib/battleEngine.ts`, and
`lib/typeData.ts` functions directly -- not reimplementations.

- **Evolution**: 1,520 derived-stat trials across all 73 species with a
  non-null `evolvesInto` (every branch, including all 4 of Eevee's),
  20 synthetic "burned" quintets per target spanning z-scores from -2.5 to
  +2.5 around the pre-evolution species' own stats (not just average
  rolls) -- 0 failures (every stat finite, ≥1, and within 3x the evolved
  species' own base stat even at the most extreme synthetic input).
  Eevee's 4-way branch: 40,000 trials via the real `resolveEvolutionTarget()`,
  landing at 24.77-25.31% per branch (max deviation 0.31pp from the
  expected even 25% split) -- confirms the uniform-random-over-however-
  many-entries design (main.md's key decisions) holds now that step 52
  grew the array from 3 to 4.
- **Psychic counterplay — a real bug found and fixed**: confirmed the
  move pool actually gained Dark damage moves (Bite/Crunch/Dark Pulse, via
  the existing per-species-canonical-moveset-aggregation mechanism
  `lib/data/movePool.ts` already uses -- no separate move-authoring
  step was needed beyond what step 52 already did by giving Umbreon/
  Houndoom/Tyranitar their own Dark damage moves in `pokedex.json`), and
  that `rollMoveset()` actually draws them (79-80% of Umbreon's own damage
  slots roll Dark, dropping to 36-50% for dual-typed Houndoom/Tyranitar
  since their *other* own-type competes for the same weighted slot --
  informational, not a failure: the 5,000-roll-per-species check confirmed
  99.7%/80.7%/93.7% of *movesets* still land at least one Dark damage
  move, and — the actual point — incoming-damage immunity is guaranteed by
  body type alone, confirmed independent of moveset in the next check).
  Then ran real `resolveRound()` battles, Mewtwo's Psychic move vs. each
  Dark-type's own Dark move, 200 trials each: **found that Mewtwo's
  Psychic dealt nonzero (floored-to-1) damage in all 600/600 trials before
  a fix** -- `executeDamage()`'s `Math.max(1, Math.floor(rawDmg * mult *
  rng))` floor, meant to stop a merely *weak* (0.5x) hit from silently
  rounding to 0, was unconditionally flooring a genuine 0x immunity hit up
  to 1 damage too -- directly contradicting the "🛡️ NO EFFECT (0.0x)" log
  line shown for the exact same hit, and undermining this wave's entire
  stated goal of giving Mewtwo a *hard* counter. This predates the wave
  (the same bug affects Fighting-vs-Ghost and Ghost-vs-Normal, both
  pre-existing 0x matchups elsewhere in the type chart) but was never
  exercised by a true immunity matchup until this step's own validation
  went looking for one. Fixed in `lib/battleEngine.ts`: `mult === 0 ? 0 :
  Math.max(1, ...)`, provably a strict subset of the prior behavior (the
  non-zero branch is byte-identical) so no regression risk elsewhere.
  Re-ran all 600 trials post-fix: 600/600 zero damage taken, exact-value
  confirmed too (`getTypeMultiplier("Psychic","Dark",null) === 0`,
  `getTypeMultiplier("Dark","Psychic",null) === 2`), and each Dark-type's
  own move still landed real damage against Mewtwo in the same trials
  (Umbreon 143-161/200, Houndoom 154-165/200, Tyranitar 138-142/200 across
  reruns -- the remainder are legitimate dodges/misses, not immunity).

### i18n: the sweep that mattered most, and a self-inflicted near-miss

Delegated a manual, read-only sweep of every file under `app/` and
`components/` (excluding dictionaries themselves, `app/api/**`'s
intentionally-untranslated raw error strings, and archived steps) to a
subagent, checking specifically for hardcoded prose/labels that should
have come from the dictionary. It found 3 genuine leftovers app-wide
shared chrome had missed across every prior content step: `Toast.tsx`'s
`aria-label="Dismiss"`, `Modal.tsx`'s `aria-label="Close"` (used by every
dialog in the app), and `Sprite.tsx`'s `"[No Image]"` broken-image
fallback plus its alt text's hardcoded word "sprite" -- all three
Client Components that had never called `useDictionary()` because no
prior step's cluster scope happened to touch them. Fixed all three with
new `common.close`/`common.dismiss`/`common.noImage` entries.

Wiring `Sprite.tsx`'s alt text (`${name} ${form} sprite` -- needs to be a
function to reorder correctly in Spanish: "sprite {form} de {name}")
directly into `common` **reintroduced steps 55/56's own RSC-boundary bug,
this time self-inflicted**: `app/[lang]/(app)/layout.tsx` (a Server
Component) passes `dict.common` *as a whole* to `SideNav` as a prop, a
crossing that's only ever been safe because every existing `common` entry
was a plain string. Caught immediately by this step's own live-HTTP
validation (every authenticated page returned the `id="__next_error__"`
shell) rather than by `build`/`lint` (both passed regardless, same silent-
failure shape steps 55/56 already flagged). Fixed by moving the one
function-valued entry to a new top-level `ui.spriteAlt` dictionary
section instead -- `Sprite.tsx` reads it via its own `useDictionary()`
call, so it never needs to cross a Server->Client prop boundary at all.
Re-verified with a small script asserting zero functions anywhere under
`common` in either locale (a check worth keeping in mind, not just this
one instance, for anything added to `common` in the future), then
re-fetched all 10 authenticated pages x 2 locales over real HTTP: all 200,
zero `__next_error__` occurrences, server log clean, sprite alt text
confirmed rendering correctly in both languages ("Bulbasaur normal
sprite" / "sprite normal de Bulbasaur").

**Genuinely unverifiable in this environment, called out explicitly
rather than assumed done**: same limitation `archive/v6/47-...md` already
documented -- this is a CLI-only environment with no browser, so a real
visual/manual pass (catching anything a grep-based sweep and HTTP-level
checks structurally can't, like text overflow, a truncated translation
breaking a fixed-width layout, or a screen-reader actually reading the
new aria-labels aloud) has not been done and should happen before/
alongside real player traffic on the bilingual UI, same as v6's still-
outstanding manual pass.

### Validation performed

- `rm -rf .next` + fresh `npm run build`, `npm run lint`: both clean,
  run twice more after the two bugs above were found and fixed.
- Roster-wide roster script (evolution + Eevee branch + Dark move pool +
  Mewtwo battle simulation + exact type-multiplier check) -- see above,
  0 failures post-fix.
- Subagent-delegated i18n sweep of every non-dictionary `app/`/`components/`
  file, both genuine findings fixed and independently re-verified by that
  same subagent afterward (`tsc --noEmit` clean, old literal strings
  confirmed gone via re-grep).
- Live HTTP validation against local Supabase with a real signed-up
  account and session cookie: all 10 authenticated pages x 2 locales
  (dashboard/inventory/pokedex/battle/online/friends/notifications/
  history/leaderboard/profile) fetched, all 200, zero `__next_error__`
  occurrences, server log inspected directly (clean) rather than just
  trusting the HTTP status code.
