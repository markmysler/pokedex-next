# Step 9: Team picker parity with Inventory (search/filter/sort, shared components)

## Why here

Depends on step 8 so the shared card component this step extracts already
knows how to show nicknames — doing it in the other order would mean
touching the same component twice. With accounts eventually holding
several hundred Pokémon, `TeamPicker.tsx`'s flat, unfiltered grid (reused
by bot 3v3, online 3v3, and step 12's trade builder) stops being usable
well before then. `InventoryPageClient.tsx` already solved this exact
problem (search, type filter, grid/list toggle) — this step shares that
solution instead of rebuilding it, per the request that motivated this
step ("maybe they could both share some components to prevent useless
repetition").

Also the natural place to add a shiny badge to team selection: step 3
(shiny Pokémon) deliberately listed every owned-instance display surface
*except* `TeamPicker.tsx`, since at the time it was still a bespoke inline
grid. Once this step reuses `PokemonInstanceCard` (already shiny-aware)
inside `TeamPicker`, the shiny badge shows up there for free — not a
separate change.

## What changes

### Shared filtering/sorting logic
- New `lib/pokemonFilters.ts` — a pure function, not a hook (both callers
  need the filtered array as a plain value to further layer their own
  selection-state logic on top, so a hook would just add indirection):
  ```ts
  export type SortKey = "total-desc" | "total-asc" | "name-asc" | "number-asc";

  export function filterAndSortPokemon(
    pokemon: OwnedPokemon[],
    opts: { search: string; typeFilter: string; sortBy: SortKey }
  ): OwnedPokemon[]
  ```
  Search matches name, number, or nickname (case-insensitive substring —
  once step 8 ships, a nicknamed Pokémon should be findable by either
  name). Type filter matches `type1`/`type2` (same semantics as
  `InventoryPageClient.tsx`'s existing filter). Default sort:
  `"total-desc"` — with hundreds of Pokémon, strongest-first is the most
  useful default for picking a team; `InventoryPageClient.tsx` keeps its
  own current default (unsorted/insertion order) unless explicitly changed
  by the user, so this doesn't alter Inventory's existing behavior.
- New `components/pokemon/PokemonFilterBar.tsx` — controlled
  search input + type `<select>` + sort `<select>`, presentational only
  (`{ search, onSearchChange, typeFilter, onTypeFilterChange, sortBy,
  onSortByChange, typesList }`). Reused by both `InventoryPageClient.tsx`
  (replacing its inline toolbar markup, gaining a sort dropdown it didn't
  have before) and `TeamPicker.tsx` (gaining search/filter/sort it didn't
  have before).

### Shared card component
- `PokemonInstanceCard.tsx` already takes `{ pokemon, variant, selected,
  onSelect }` — exactly what `TeamPicker`'s inline grid-card markup
  duplicates today. Add one optional prop, `pickOrder?: number`, rendering
  the existing `.team-picker-order` "#1/#2/#3" badge overlay only when
  provided (so `InventoryPageClient`'s usage is unaffected). `TeamPicker`
  then renders `PokemonInstanceCard` directly instead of its own inline
  `.pokemon-grid-card` JSX — one card implementation, not two.

### `TeamPicker.tsx`
- Gains local `search`/`typeFilter`/`sortBy` state, `PokemonFilterBar`, and
  filters `inventory` through `filterAndSortPokemon()` before mapping to
  cards. Selection state (`selected: string[]`, keyed by id) is already
  independent of the filtered/sorted view, so filtering never loses a
  pick already made — no change needed there.
- No pagination/virtualization added. A few hundred DOM nodes in a grid is
  fine without it (`InventoryPageClient` already faces the identical
  scale without pagination); if it ever becomes a real problem, windowing
  (e.g. `react-window`) is a later, isolated addition — not needed to ship
  this.

### `InventoryPageClient.tsx`
- Swaps its inline toolbar for `PokemonFilterBar` (adds a sort dropdown;
  search/type-filter behavior unchanged) — mechanical, not a redesign.

## End state

- [x] `TeamPicker` (used by bot 3v3 and online 3v3 team selection) has
      search, type filter, and sort — verify picking a specific Pokémon out
      of a large inventory by name/number/nickname actually works.
- [x] Shiny Pokémon show the shiny sprite + badge in `TeamPicker`, matching
      every other owned-instance surface.
- [x] `InventoryPageClient` behaves exactly as before (search, type filter)
      plus a new sort control, using the same shared `PokemonFilterBar`.
- [x] Selecting Pokémon for a team survives changing the search/filter/sort
      mid-pick (already-selected picks aren't lost or hidden).
- [x] Nicknames (step 8) show correctly in `TeamPicker`'s cards, inherited
      from the shared `PokemonInstanceCard`, not re-implemented here.
- [x] `npm run build` / `npm run lint` clean.

### Validation notes (2026-08-08)

- `npm run build` and `npm run lint` both clean. No migration needed for
  this step, so validation ran directly against the live Supabase project
  with no push-and-wait step.
- One deliberate deviation from the plan's literal type sketch: `SortKey`
  gained a 5th value, `"unsorted"`, beyond the four listed
  (`total-desc`/`total-asc`/`name-asc`/`number-asc`). The plan's own prose
  requires Inventory to keep its "unsorted/insertion order" default
  unchanged while `TeamPicker` defaults to `"total-desc"` — the listed key
  set has no way to express "no sort," so an explicit `"unsorted"` option
  (a no-op in `filterAndSortPokemon`'s switch) was added to satisfy that
  requirement rather than picking an arbitrary substitute default.
- `typesList` is threaded as a prop from each server page
  (`app/(app)/battle/page.tsx`, `app/(app)/online/page.tsx`) through
  `BattleArena`/`OnlineBattle` into `TeamPicker`, rather than having
  `TeamPicker` import `lib/pokedex.ts` directly — every other client
  component gets Pokédex data via props today, and importing it directly
  would have pulled the ~130KB `pokedex.json` into the client bundle for
  the first time. Matches the existing convention instead of introducing a
  new one.
- Ran a temporary end-to-end validation (deleted after running) against a
  local dev server, using 1 disposable test account with 3 directly-seeded
  `pokemon_instances` rows spanning a wide total-stat range (weak/mid/very
  strong), one nicknamed ("Sparky"), one shiny-qualifying (stats/moveset
  rolled far above species base, computed via the same z-score formula
  `lib/shiny.ts` uses) — 14 checks, all passing: `/battle`'s `TeamPicker`
  defaults its sort dropdown to "Total (high to low)" and the real SSR'd
  card order actually reflects that (strongest first, not just the default
  option selected); the nickname shows as the primary label via the shared
  `PokemonInstanceCard`; the shiny badge renders in `TeamPicker`, which it
  never did before this step; `/inventory`'s sort dropdown still defaults
  to "Default order" and its real SSR'd order is unchanged
  (insertion/`created_at`-desc, not total-sorted) — confirming the shared
  refactor didn't alter Inventory's existing behavior; the existing
  grid/list view toggle and count label are untouched; `/online` renders
  cleanly with `TeamPicker`'s new `typesList` prop wired through.
- Not independently verified via a real browser (no browser automation
  tool available in this environment): actually typing into the search box
  and watching the grid filter live, or toggling the sort/type dropdowns
  post-hydration and confirming already-selected team picks survive. The
  underlying `filterAndSortPokemon()` logic was exercised for real by the
  SSR order checks above (both defaults produce the correct order via the
  real function, not a mock), and the selection-state code was reviewed by
  hand — `selected: string[]` is keyed by id and built from `inventory`
  directly, entirely independent of the `filtered` array used only for
  rendering, so filtering cannot lose or hide an existing pick. This is the
  same category of gap flagged in steps 5 and 8's validation notes.
