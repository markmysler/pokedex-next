# Step 48: Evolution — species data model

**Status: shipped.** See `main.md`'s "Evolution, Psychic counterplay,
and bilingual support" section for the full context and dependency chain.

## Why here

First step of the evolution slice — steps 49 (stat/moveset logic), 50
(DB/RPC), and 51 (API/UI) all need `evolvesInto` to exist on `Pokemon`
before there's anything to look up. No behavior change in this step: it
only adds the field and populates it for all 151 species.

## What changes

### The new field (`types/pokemon.ts`)

```ts
export interface Pokemon {
  // ...existing fields unchanged...

  // The immediate next evolutionary stage, by dex number — null for a
  // Pokemon with no further evolution (either a final stage, or one that
  // never evolves in Gen 1 at all). A plain string for every species except
  // Eevee, whose 3-way branch (Vaporeon/Jolteon/Flareon) is resolved by a
  // uniform random pick server-side at evolve time (upgrades/main.md's key
  // decisions) — this is deliberately NOT a player choice, so it's typed as
  // an array here rather than adding a separate "branches" field.
  evolvesInto: string | string[] | null;
}
```

Lives on the base `Pokemon` species record in `lib/data/pokedex.json`
(species-level, same home as `type1`/`moves`/base stats) — not a new DB
column or table. There's no species-level table in the schema at all today;
only per-instance `pokemon_instances` rows exist in Postgres. This mirrors
every other species-level fact the codebase already keeps out of the DB.

### Populating all 151 entries

Standard Gen 1 evolution chains (cross-checked against Bulbapedia/PokémonDB
during planning), by dex number. Every species not listed here gets
`evolvesInto: null` (final-stage or non-evolving, e.g. Onix, Scyther,
Lapras, the birds, Mewtwo, Mew).

| # | Species | evolvesInto |
|---|---|---|
| 001 Bulbasaur | "002" |
| 002 Ivysaur | "003" |
| 004 Charmander | "005" |
| 005 Charmeleon | "006" |
| 007 Squirtle | "008" |
| 008 Wartortle | "009" |
| 010 Caterpie | "011" |
| 011 Metapod | "012" |
| 013 Weedle | "014" |
| 014 Kakuna | "015" |
| 016 Pidgey | "017" |
| 017 Pidgeotto | "018" |
| 019 Rattata | "020" |
| 021 Spearow | "022" |
| 023 Ekans | "024" |
| 025 Pikachu | "026" |
| 027 Sandshrew | "028" |
| 029 Nidoran♀ | "030" |
| 030 Nidorina | "031" |
| 032 Nidoran♂ | "033" |
| 033 Nidorino | "034" |
| 035 Clefairy | "036" |
| 037 Vulpix | "038" |
| 039 Jigglypuff | "040" |
| 041 Zubat | "042" |
| 043 Oddish | "044" |
| 044 Gloom | "045" |
| 046 Paras | "047" |
| 048 Venonat | "049" |
| 050 Diglett | "051" |
| 052 Meowth | "053" |
| 054 Psyduck | "055" |
| 056 Mankey | "057" |
| 058 Growlithe | "059" |
| 060 Poliwag | "061" |
| 061 Poliwhirl | "062" |
| 063 Abra | "064" |
| 064 Kadabra | "065" |
| 066 Machop | "067" |
| 067 Machoke | "068" |
| 069 Bellsprout | "070" |
| 070 Weepinbell | "071" |
| 072 Tentacool | "073" |
| 074 Geodude | "075" |
| 075 Graveler | "076" |
| 077 Ponyta | "078" |
| 079 Slowpoke | "080" |
| 081 Magnemite | "082" |
| 084 Doduo | "085" |
| 086 Seel | "087" |
| 088 Grimer | "089" |
| 090 Shellder | "091" |
| 092 Gastly | "093" |
| 093 Haunter | "094" |
| 096 Drowzee | "097" |
| 098 Krabby | "099" |
| 100 Voltorb | "101" |
| 102 Exeggcute | "103" |
| 104 Cubone | "105" |
| 109 Koffing | "110" |
| 111 Rhyhorn | "112" |
| 116 Horsea | "117" |
| 118 Goldeen | "119" |
| 120 Staryu | "121" |
| 129 Magikarp | "130" |
| 133 Eevee | ["134", "135", "136"] |
| 138 Omanyte | "139" |
| 140 Kabuto | "141" |
| 147 Dratini | "148" |
| 148 Dragonair | "149" |

Every species not in this table (including all final stages like Venusaur,
Charizard, Blastoise, Alakazam, Gengar, and every never-evolving species
like Farfetch'd, Lickitung, Tauros, Ditto, Porygon, Snorlax, the 3
legendary birds, Mewtwo, Mew) gets `evolvesInto: null`.

Note that the original games gate most of these behind level-up, a specific
stone, or a trade — this project's evolution mechanic (step 50) replaces
*all* of those methods uniformly with "burn 5 of the pre-evolution," so the
table above only needs the *chain*, not the original trigger. This was a
deliberate simplification confirmed with the user during planning (see
`main.md`) rather than an oversight.

### What does NOT change in this step

- `lib/collection.ts` — the stat-derivation/moveset-roll logic that
  *consumes* `evolvesInto` is step 49's job.
- Nothing in the DB — the atomic burn-and-create transaction is step 50.
- No UI reads this field yet — step 51.

## End state

- [x] `Pokemon.evolvesInto: string | string[] | null` added to
      `types/pokemon.ts`.
- [x] All 151 entries in `lib/data/pokedex.json` have `evolvesInto` set per
      the table above (or `null`), no other field touched.
- [x] `npm run build` / `npm run lint` clean — this step only adds an
      optional-in-practice field, nothing should break from it existing.
- [x] A quick script check: every non-null `evolvesInto` value (including
      each element of Eevee's array) resolves to a real key in
      `lib/data/pokedex.json`.

## What actually happened

Implemented and validated exactly as planned, on the `v7` branch, no DB
involved (this step is pure static species data, so it didn't need the
local Supabase stack — that was still pulling Docker images in the
background while this step was validated).

- Added the `evolvesInto` field to `Pokemon` in `types/pokemon.ts`, same
  doc comment as drafted above.
- Wrote a one-off Node script to populate all 151 `lib/data/pokedex.json`
  entries: 70 non-null (matching the 70-row table exactly) + 81 `null`.
  The script rebuilt the file entry-by-entry in the *original on-disk key
  order* rather than round-tripping through `JSON.stringify(parsedObject)`
  — plain `JSON.parse`+`JSON.stringify` would have silently reordered
  species "100"-"151" to the front, since JS engines always enumerate
  integer-like string keys in ascending numeric order first regardless of
  insertion order. Confirmed via `git diff --stat`: 305 insertions / 150
  deletions, i.e. exactly one new `"evolvesInto"` line per species plus the
  changed closing bracket — no incidental reordering or reformatting.
- Validated every non-null target (including both entries of Eevee's
  3-way array) resolves to a real `lib/data/pokedex.json` key, and that
  the table's 70 listed rows match the 70 non-null entries written.
- `npm run lint` clean, `npm run build` clean (TypeScript + full static/
  dynamic route generation, 30 pages).
- Spot-checked known chains directly off the written JSON: Bulbasaur→002,
  Venusaur→null, Pikachu→026, Eevee→[134,135,136], Vaporeon→null,
  Mewtwo/Mew→null, Charizard/Blastoise→null.

## End state (confirmed)

All 4 boxes above are checked and verified on disk on the `v7` branch.
