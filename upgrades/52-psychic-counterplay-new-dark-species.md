# Step 52: Psychic counterplay — Umbreon/Houndoom/Tyranitar full lines + Dark damage moves + sprites

**Status: shipped.** See `main.md`'s "Evolution, Psychic counterplay, and
bilingual support" section for the full context and dependency chain.

## Why here

No dependency on the evolution slice (steps 48-51) — could ship
independently, and placed right after it mainly because both are gameplay
content changes, ahead of the larger i18n slice (53-58) for the same reason
evolution is: so the i18n content steps translate these species' final,
shipped strings once, not twice.

## What changes

### The problem, confirmed during planning

`TYPE_MATCHUPS.Psychic.Dark = 0.0` (`lib/typeData.ts`) is the *only* type
immune to Psychic damage in the whole chart, and Dark doesn't exist
anywhere in the current 151-species roster — Dark wasn't introduced until
Gen 2. Ghost and Bug are both 2x offensively against Psychic (from their own
attacker rows) but neither resists a Psychic hit back (no entry in
`TYPE_MATCHUPS.Psychic` for either, so both take neutral damage) — meaning
nothing in this game is currently immune to Mewtwo, full stop. Critically,
**this counter already works with zero engine changes**: a Dark-type using
a Dark-type move against Mewtwo already deals 2x damage (`TYPE_MATCHUPS.
Dark.Psychic = 2.0`) while taking 0x back, purely from the existing type
chart — a decisive, unwinnable-for-Mewtwo matchup with nothing new to build
in the battle engine itself. (A same-type-attack-bonus mechanic was
considered during planning specifically to reinforce this further, and
explicitly rejected — see `main.md`'s key decisions for the full reasoning;
the short version is that the 2x/0x split above already fully decides this
matchup, so it wasn't solving a real gap here, and its actual measured
effect elsewhere skewed toward making high-stat outliers like Mewtwo
stronger, not weaker.)

### 6 new species — full pre-evolution lines, not just the final stages

Confirmed with the user directly: add real Dark-type species (over
retyping/buffing an existing Kanto one, which would have stayed
Kanto-only), **and add each one's complete evolution line**, not just the
counter-relevant final stage — a deliberate, acknowledged break from "all
151 Kanto species."

| Species | Dex # | Type | Base stats (hp/atk/def/spatk/spdef/spd, total) | evolvesInto |
|---|---|---|---|---|
| Umbreon | 197 | Dark | 95/65/110/60/130/65, 525 | null |
| Houndour | 228 | Dark/Fire | 45/60/30/80/50/65, 330 | "229" |
| Houndoom | 229 | Dark/Fire | 75/90/50/110/80/95, 500 | null |
| Larvitar | 246 | Rock/Ground | 50/64/50/45/50/41, 300 | "247" |
| Pupitar | 247 | Rock/Ground | 70/84/70/65/70/51, 410 | "248" |
| Tyranitar | 248 | Rock/Dark | 100/134/110/95/100/61, 600 | null |

(Real canonical values — sanity-check against Bulbapedia/PokémonDB during
implementation, same standard this project already held itself to for the
original 151. Note Larvitar/Pupitar are **not** Dark-type — Tyranitar only
gains Dark on its final evolution, same as the real games — so only
Houndour/Houndoom/Umbreon/Tyranitar actually need the new Dark damage moves
below; Larvitar/Pupitar roll fine from the existing Rock/Ground pools.)

Added to `lib/data/pokedex.json` the same way every existing entry is
structured (number, name, type1/type2, stats, moves array, evolvesInto).

### Eevee's branch grows from 3-way to 4-way — amending step 48's data

Step 48 ships Eevee (#133) with `evolvesInto: ["134", "135", "136"]`
(Vaporeon/Jolteon/Flareon) — correct and self-contained on its own, since
that's the historically-accurate Gen 1 set (Umbreon wasn't introduced until
Gen 2, same reason Dark didn't exist yet either). **This step appends
Umbreon:** `evolvesInto: ["134", "135", "136", "197"]`. Step 49's derivation
logic already resolves this branch by a uniform random pick over however
many entries the array holds (not a hardcoded "1 of 3"), so no engine change
is needed here — only the data edit to Eevee's existing entry, made
alongside this step's other `pokedex.json` additions.

### New Dark damage moves (`lib/data/movePool.ts`)

The move pool currently has **zero Dark-type damage moves** — only 3 Dark
support moves exist (Screech: debuff, Vampire Fang: drain, Taunt:
redirect), a gap already flagged as pre-existing in `archive/v6/main.md`'s
key decisions ("Dark has 0 own-type damage moves in the pool at all").
Without fixing this, Houndour/Houndoom/Umbreon's 85%-own-type damage-slot
rolls (`SAME_TYPE_CHANCE`, `lib/collection.ts`) would starve and fall back
to the any-type pool 100% of the time — meaning they'd rarely actually get
a Dark move to land that decisive 2x hit with in the first place, not just
"no Dark-flavored move for flavor's sake." Author at least 2 new Dark-type
`DamageMove` entries (a low/mid/high power spread, following the existing
tiered `max_uses` convention from `upgrades/40-uses-based-move-data-
model.md`'s tier table) — exact names/power/uses left to implementation,
following the same authoring conventions every other type's damage pool
already uses.

### Sprites

`components/Sprite.tsx` expects `/public/images/{name.toLowerCase()}_
{normal|shiny}.gif` — 12 new files needed (normal + shiny for each of the 6
species): `umbreon`, `houndour`, `houndoom`, `larvitar`, `pupitar`,
`tyranitar` (all single-word names, no hyphenation edge cases like
`mr-mime`/`nidoran-f`/`farfetchd` needed). A fallback is already in place
(`Sprite.tsx` renders a "[No Image]" placeholder on load failure), so a
missing file degrades gracefully rather than breaking the page — but the
real files should still be sourced as part of this step, not left as a gap.

**Source, confirmed with the user — the exact same source the existing 151
species' sprites came from**: PokémonDB's animated Black/White sprites,
`https://img.pokemondb.net/sprites/black-white/anim/{normal|shiny}/
{name}.gif`, lowercase species name. The user provided the original Python
download script used for the existing roster; reproduced below trimmed to
this step's 6-species list and pointed at `public/images/` directly
(same URL pattern and `{name}_{normal|shiny}.gif` output naming as the
original, which already matches `Sprite.tsx`'s expected convention exactly
— no rename step needed):

```python
import os
import requests

carpeta_destino = "public/images"  # this project's actual sprite folder
os.makedirs(carpeta_destino, exist_ok=True)

nombres = ["umbreon", "houndour", "houndoom", "larvitar", "pupitar", "tyranitar"]

imagenes = []
for nombre in nombres:
    imagenes.append((f"https://img.pokemondb.net/sprites/black-white/anim/shiny/{nombre}.gif", f"{nombre}_shiny.gif"))
    imagenes.append((f"https://img.pokemondb.net/sprites/black-white/anim/normal/{nombre}.gif", f"{nombre}_normal.gif"))

for url, nombre_archivo in imagenes:
    respuesta = requests.get(url)
    if respuesta.status_code == 200:
        ruta = os.path.join(carpeta_destino, nombre_archivo)
        with open(ruta, 'wb') as f:
            f.write(respuesta.content)
        print(f"Descargada: {nombre_archivo}")
    else:
        print(f"Error al descargar {nombre_archivo} desde {url}")
```

12 requests total (6 species × normal/shiny) — small enough to just run
directly against the real URLs when this step is implemented, no batching/
rate-limit handling needed. Sanity-check each downloaded file opens as a
valid animated gif before committing (PokémonDB 404s render as a small
error-page response, not a gif, if a name is ever misspelled/missing).

### What does NOT change in this step

- `lib/typeData.ts`'s `TYPE_MATCHUPS`/`TYPE_COLORS` — Dark is already fully
  defined there (used defensively by `Psychic.Dark = 0.0`, offensively by
  its own `Dark: { Psychic: 2.0, Ghost: 2.0, ... }` row); nothing to add.
- No changes to `lib/battleEngine.ts` at all — the counter works entirely
  off existing type-effectiveness math, no new damage mechanic involved
  (see "why here" above for why a same-type bonus was considered and
  dropped).
- No changes to `lib/collection.ts`'s roll weighting logic itself, and no
  change to step 49's Eevee-branch-resolution logic — it already reads
  `evolvesInto`'s length dynamically.

## End state

- [x] Umbreon, Houndour, Houndoom, Larvitar, Pupitar, Tyranitar all added to
      `lib/data/pokedex.json` with real canonical stats/types/evolvesInto,
      each with a populated moveset.
- [x] Eevee's (#133) existing `evolvesInto` array amended from 3 entries to
      4, adding Umbreon.
- [x] At least 2 new Dark-type `DamageMove` entries added — ended up in
      `lib/data/pokedex.json` directly rather than `lib/data/movePool.ts`
      (see "What actually happened" — the damage pool auto-derives from
      species data, this file doesn't hand-author damage moves at all), so
      Houndour/Houndoom/Umbreon/Tyranitar's own-type damage pool isn't empty.
- [x] 12 sprite files added to `public/images/` (normal + shiny for each of
      the 6 species).
- [x] Dex-size-derived stats (`pokedexOwnedPct`, dashboard/leaderboard
      completion figures) reflect the new total (157) automatically —
      spot-check one to confirm, since this relies on no hardcoded `151`
      existing rather than a code change in this step.
- [x] A validation pass (same shape as `archive/v6/main.md`'s roster-wide
      rolls): simulate battles between Mewtwo and each of
      Umbreon/Houndoom/Tyranitar and confirm the Dark side takes 0 damage
      from any Psychic-type move Mewtwo uses, and deals 2x when it lands its
      own Dark-type move.
- [x] Eevee's 4-way branch spot-checked for roughly even (1/4 each)
      distribution over repeated evolve simulations, alongside step 51's own
      original 3-way check.
- [x] `npm run build` / `npm run lint` clean.

## What actually happened

Implemented and validated on `v7`. Pure static data + assets, no DB/API
involved, so validated independently of the local Supabase instance.

- All 6 species appended to `lib/data/pokedex.json` after Mew (#151) —
  physically at the end of the file (dex numbers 197-248 sort after 151
  anyway), so the diff touches nothing in the existing 151 entries except
  Eevee's `evolvesInto` array. Stats/types/evolution chain match the
  planned table exactly.
- **Movesets modeled directly on the existing convention, confirmed by
  inspecting real non-starter multi-stage lines first** (Abra/Kadabra/
  Alakazam, Gastly/Haunter/Gengar, Zubat/Golbat, Geodude/Rhyhorn/Onix):
  every existing line uses an **identical 4-move set across every stage**
  (2 moves per type, low + mid power, ~40-80 range), not scaling by
  evolution stage or total stat — the plan's draft hadn't nailed this down,
  so this was worth confirming before authoring anything. Applied exactly:
  Umbreon (Bite/Crunch + Tackle/Scratch filler, matching the Eeveelution
  sibling pattern precisely), Houndour = Houndoom (Ember/Flame Wheel +
  Bite/Crunch, reusing existing Fire moves), Larvitar = Pupitar (Rock
  Throw/Rock Slide/Mud-Slap/Dig, reusing the exact existing Geodude/Onix
  moveset verbatim, per the plan's own note that these two need no new
  moves). Tyranitar is the one deliberate exception to "identical across
  the line" — justified, not arbitrary: it gains Dark at the final stage
  (dropping Ground), so its type2 half of the moveset has to change
  regardless; gets Rock Throw/Rock Slide (kept) + Bite/Dark Pulse (new),
  giving the new move family a genuine low(40)/mid(65)/high(90) power
  spread across the 4 species that needed one, as the plan asked for.
- **New Dark damage moves ended up needing zero edits to
  `lib/data/movePool.ts`**, contrary to the plan's original assumption:
  confirmed by reading that file's actual source that `allMoves`/
  `movesByType` (the damage pool `rollMoveset()` draws from) is
  *auto-derived* by deduplicating every species' own `moves` array in
  `pokedex.json` — `movePool.ts` only hand-authors the buff/debuff/drain/
  redirect (support) pools, never damage moves directly. So adding Bite
  (Dark/Physical/40/5), Crunch (Dark/Physical/65/4), and Dark Pulse
  (Dark/Special/90/2) to the new species' own `pokedex.json` entries was
  both necessary and sufficient — confirmed directly (see validation below).
- Sprites: downloaded all 12 files for real using the user-provided
  PokémonDB URL pattern (`upgrades/52-...md`'s own script), verified
  distinct-but-similarly-sized normal/shiny pairs weren't an accidental
  duplicate bug (compared MD5 hashes — genuinely different content, GIFs
  of similar dimensions just compress to similar sizes) and visually
  spot-checked Umbreon and Tyranitar's normal/shiny pairs directly.

### Validation performed

- Confirmed via direct computation of the real, unchanged `TYPE_MATCHUPS`
  rows (`lib/typeData.ts` untouched, re-verified) through the actual
  `getTypeMultiplier()` formula: Mewtwo's Psychic moves deal **0x** to
  Umbreon, Houndoom, and Tyranitar (Psychic.Dark = 0.0, regardless of the
  second type since it's multiplicative and the Dark factor alone zeroes
  it), and each of those 3 deals **2x** back with any Dark move
  (Dark.Psychic = 2.0) — the decisive counter, zero engine changes,
  exactly as designed.
- Confirmed the move-pool-starvation concern is actually resolved, not
  just type-chart-correct in theory: simulated 5,000 damage-slot draws
  (reproducing `rollOneMove`'s exact 85%-own-type logic) for each of the 4
  Dark-needing species. Dark-move roll rates: Umbreon 86.3% (single Dark
  type, matches `SAME_TYPE_CHANCE` almost exactly), Houndour 37.4% /
  Houndoom 36.1% (split with the much larger roster-wide Fire pool, still
  far from starved), Tyranitar 51.4% (split with the roster-wide Rock
  pool). All previously would have been 0% before this step.
- Confirmed `pokedexOrder.length` (used by `pokedexOwnedPct`, lootbox/bot
  species rolls) is 157 automatically — no hardcoded `151` exists anywhere
  in `app/`/`lib/`/`components/`/`types/` (re-confirmed via a full grep).
- Eevee's now-4-way branch (`["134","135","136","197"]`), re-checked live
  the same way step 51 checked the original 3-way: 40 real evolve calls
  through the actual running route (fresh test account, local Supabase),
  no code change needed beyond this step's own data edit — exactly the
  guarantee `resolveEvolutionTarget()` (step 49) was designed around.
  Result: 14 Umbreon / 7 Flareon / 8 Vaporeon / 11 Jolteon — all 4
  branches hit, consistent with uniform random at this sample size.
- `npm run lint` / `npm run build` clean.
