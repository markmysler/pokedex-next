# Step 55: i18n content — Collection cluster

**Status: Shipped.** See `main.md`'s "Evolution, Psychic counterplay,
and bilingual support" section for the full context and dependency chain.

## Why here

Needs step 53's infrastructure. Also depends on step 51 (the Evolve UI) and
step 52 (the 6 new species) specifically because this cluster is where both
land — translating it before those ship would mean redoing part of this
step once their strings exist.

## What changes

Covers `design/REDESIGN_TRACKER.md`'s "Collection cluster": **Pokédex
(list+detail), Inventory (list+detail), Lootbox reveal** — plus, new since
that tracker was written, the **Evolve action + reveal dialog** from step
51, and the 6 new species (Umbreon, Houndour, Houndoom, Larvitar, Pupitar,
Tyranitar) from step 52 wherever their names/flavor surface in UI copy (not
the names themselves, per step 54's "proper nouns stay as-is" note, but any
surrounding descriptive text).

Same mechanical approach as step 54: dictionary lookups replacing literal
strings, real `es-AR` translations (not placeholders), in both Server and
Client Components across this cluster.

Specific known surfaces: `PokemonDetail.tsx`'s "Normal Form"/"Shiny Form"
labels; `InventoryPageClient.tsx`'s Trade Up and new Evolve flows'
copy/confirmation text; `LootboxRevealDialog.tsx`'s phase copy; move
tooltip/effect text from `lib/pokemonDisplay.ts` if it's rendered as
user-facing prose anywhere in this cluster (shared with the Battle cluster
too — coordinate with step 56 so this shared utility's strings aren't
translated twice inconsistently).

### What does NOT change in this step

- No new routing/dictionary mechanics.
- `lib/pokemonDisplay.ts`'s functions themselves — if they need to become
  locale-aware (e.g. `moveEffectText()` returning a translated string),
  that's a shared concern with step 56; decide during implementation
  whether to handle it here, there, or as a small shared prerequisite
  touched once.

## End state

- [x] Pokédex, Inventory, Lootbox reveal, and the new Evolve UI render
      fully in either locale with no leftover hardcoded English (or vice
      versa).
- [x] The 6 new species' surrounding UI copy (not their names) is
      translated consistently with the rest of the cluster.
- [x] `npm run build` / `npm run lint` clean.

## What actually happened

### `lib/pokemonDisplay.ts`: no changes needed

Confirmed during implementation, as the plan flagged as a decision point:
Pokédex/Inventory/Lootbox reveal only ever call `movePower()` (a number, not
prose) and `displayName()` (nickname-or-species-name passthrough, not
translatable). `moveEffectText()`/`moveTooltip()` — the two functions that
actually build translatable prose — are called only from
`components/battle/MoveButton.tsx`, entirely step 56's (Battle cluster)
territory. This file is untouched by step 55.

### Dictionary shape

`common` picked up entries shared across Pokédex *and* Inventory (and,
later, Team Picker): `stats` (the HP/Attack/Defense/Sp. Atk/Sp. Def/Speed
labels, previously duplicated as three separate hardcoded arrays in
`PokemonDetail.tsx`, `InventoryPageClient.tsx`, and
`LootboxRevealDialog.tsx` — now one dictionary source read by all three),
`viewToggle` (Grid/List), `backToList`, `cancel`, `allTypesLabel`, and
`filterBar` (backing the shared `PokemonFilterBar.tsx`). `collection`
picked up `pokedex.*`, `inventory.*`, and three cross-cutting entries used
by both the Inventory detail panel and `LootboxRevealDialog` identically
(`movesLabel`, `totalLabel`, `moveLine`).

The 6 new species (step 52) needed zero new dictionary entries, confirming
the plan's expectation: every surrounding label on these screens is
generic, and species/move names stay untranslated proper nouns per step
54's precedent.

### A real bug caught by `npm run build`, not by inspection

First implementation had both `app/[lang]/(app)/pokedex/page.tsx` and
`.../inventory/page.tsx` (Server Components) call `getDictionary()` and
pass the *entire* `Dictionary` object down as a prop to
`PokedexPageClient`/`InventoryPageClient` (Client Components) — the same
shape step 54 used successfully for `SideNav`/`ProfilePageClient`/etc.
It doesn't work here: several dictionary entries are **functions**
(`showingCount`, `completion`, `moveLine`, `confirmListItem`, …), and
React Server Components cannot serialize a function across the
Server->Client prop boundary — confirmed by `npm run start` throwing
"Functions cannot be passed directly to Client Components" and rendering
an `id="__next_error__"` shell instead of the page, caught immediately by
the very first HTTP validation request (a `curl` that should have shown
translated text showed nothing at all).

Step 54 never hit this because every dictionary slice it threaded through
a Server->Client prop (`account.welcome`, `account.profile`, `common`
*before* this step) happened to contain only plain strings — Dashboard's
own `strongestNote(...)` function was always *called* server-side (Dashboard
is itself a Server Component), so only the resulting string ever crossed
the boundary there, never the function itself.

Fix: added `lib/i18n/useDictionary.ts`, a Client Component hook mirroring
`getDictionary()` — same `usePathname()` + `localeFromPathname()` pattern
every other Client Component already uses for the locale itself, but
importing both dictionary modules directly (a plain client-side import,
no server-only API involved) instead of going through
`next/root-params`. `PokedexPageClient`/`InventoryPageClient` now call
`useDictionary()` themselves; their Server Component page.tsx files no
longer fetch or pass a dictionary at all. Passing dictionary slices
*between* Client Components (`InventoryPageClient` → `LootboxRevealDialog`,
`PokedexPageClient` → `CompletionBanner`/`PokemonDetail`) remains fine
either way, since that never crosses the RSC serialization boundary — the
restriction is Server→Client only.

### `PokemonFilterBar.tsx` and `LootboxRevealDialog.tsx`: optional `dict`, English fallback

Both are shared with call sites outside this step's scope
(`PokemonFilterBar` with `TeamPicker.tsx`, step 56; `LootboxRevealDialog`
with `BattleArena.tsx`/`OnlineBattle.tsx`, also step 56) — rather than
touch those Battle-cluster files now, both components take their
dictionary slice as an **optional** prop with an English-literal fallback
constant, so the untouched call sites keep compiling and behaving exactly
as before. `SORT_OPTIONS`' `value`s (and the pre-existing "All Types"/
status-filter sentinels in `lib/pokemonFilters.ts`/`lib/pokedex.ts`,
untouched) stay the English literals they always were; only the *displayed*
`<option>` label is decoupled from its value and localized, so translating
the visible text never risks breaking the filter/status state machines.

### Validation performed (real HTTP against a running `next start` server, local Supabase)

- `rm -rf .next` + fresh `npm run build`, `npm run lint`: both clean.
- Fetched Pokédex and Inventory in both locales with a real session
  cookie (same `@supabase/ssr`-generated cookie technique as prior steps):
  every toolbar label, filter option, stat label, badge, and detail-panel
  string confirmed present in the expected language — including the
  function-computed ones (`Showing: 157 of 157 Pokémon` / `Mostrando: 157
  de 157 Pokémon`, confirming the 6 new species are counted correctly;
  `Total: 309`; move lines like `— Fire, 110 Pwr` / `— Fire, 110 Pot.`).
- This first request also caught the Server->Client function-serialization
  bug above (an `id="__next_error__"` response instead of the expected
  markup) — fixed, then re-validated clean.
- Negative check: grepped the `es-AR` Pokédex/Inventory for English chrome
  and the `en` versions for Spanish chrome — zero matches either direction.
- Since Trade Up/Evolve confirm modals and the Lootbox/Evolve reveal
  dialogs are gated behind client-side interaction state a bare HTTP GET
  can't reach, additionally ran both dictionaries directly through Node
  (native TS stripping, same technique step 53 used) confirming identical
  key shapes between locales and exercising every function-valued entry
  (including `confirmListItem`, `selectedCount`, `openNLootboxes`) with
  sample arguments in both languages -- all produced correct, distinct
  `en`/`es-AR` strings.
