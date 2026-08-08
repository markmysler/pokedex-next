# Step 8: Per-instance Pokémon nicknames

## Why here

Independent of everything else. Ordered before step 9 (team-picker parity)
because that step touches the same card components this one adds nickname
display to — doing nicknames first means step 9's shared components
inherit nickname display for free instead of needing a second pass.

## What changes

### Data model
```sql
alter table pokemon_instances add column nickname text;
```
- Nullable — `null` means "no nickname," falls back to the species name
  everywhere. No migration needed for existing rows (they're all already
  `null`, which is the correct "unnamed" state).
- App-level validation only (matches this codebase's existing preference,
  e.g. `battle_rooms.status` has no DB constraint either): 1-24 characters
  after trimming, or empty/whitespace-only treated as "clear the nickname"
  (stored as `null`, not `"""`, so the fallback-to-species-name logic below
  only has one falsy case to check).

### Server
- `PATCH /api/inventory/pokemon/[id]/route.ts` (new — the file today only
  has `DELETE`): body `{ nickname: string | null }`, scoped to
  `.eq("user_id", user.id)` in the query itself, same ownership pattern the
  existing `DELETE` handler already uses. Trims and validates length
  server-side (never trust the client's trim), converts blank to `null`.

### Types
- `OwnedPokemon` (`types/pokemon.ts`) gains `nickname: string | null`.
- `lib/collection.ts`'s `toOwnedPokemon()` reads `row.nickname`.
- New `lib/pokemonDisplay.ts` — `displayName(pokemon: OwnedPokemon):
  string` returning `pokemon.nickname ?? pokemon.name`. One tiny shared
  helper instead of repeating `pokemon.nickname ?? pokemon.name` at every
  call site.

### Client — display
Everywhere an owned instance's name is shown prominently, the nickname (if
set) becomes the primary label, with the species name/number kept visible
as secondary context (never fully hidden — nicknames identify *your*
Pokémon, the species/number still identifies *what* it is):
- `PokemonInstanceCard.tsx` (grid + list variants, both already reused by
  step 9's team picker).
- `InventoryPageClient.tsx`'s detail panel header.
- `FighterCard.tsx` (battle title + bench member name), so a nicknamed
  Pokémon's nickname shows in both bot and online battles.
- Dashboard's top-3 team preview.
- **Not** touched: `PokedexPageClient.tsx`/`PokemonDetail.tsx` (the Pokédex
  tab is species-level, not instance-level — no nickname concept there).

Concretely: where today's markup shows `#{pokemon.number} {pokemon.name}`,
it becomes `{displayName(pokemon)}` as the prominent label, with `#{number}
{name}` demoted to a smaller secondary line when a nickname is actually
set (when there's no nickname, `displayName()` already equals `name`, so
showing both would be redundant — only show the secondary species line
when `pokemon.nickname` is truthy).

### Client — renaming
Renaming only happens from the Inventory detail panel (the account's own
collection view) — not from `TeamPicker`, `FighterCard`, or the dashboard
preview, which stay read-only display surfaces:
- `InventoryPageClient.tsx`'s detail panel gains a small inline rename
  control next to the header: an "✏️ Rename" button that swaps the header
  into a text input + "Save"/"Cancel", mirroring `ProfilePageClient.tsx`'s
  explicit-save-button pattern (not `PokemonDetail.tsx`'s debounced
  autosave-per-keystroke pattern — a nickname is a deliberate one-time
  action, not continuous free text like trainer notes).
- On save, `PATCH`es the new value and updates local state immediately
  (same "no reload" expectation the rest of this app already follows).

## End state

- [x] A Pokémon can be renamed from the Inventory detail panel; the new
      name persists across a reload.
- [x] The nickname (when set) shows as the primary label in: inventory
      grid, inventory list, inventory detail panel, both battle arenas
      (active + bench), and the dashboard team preview — with the species
      name/number still visible as secondary context.
- [x] An un-nicknamed Pokémon still shows exactly as it does today (species
      name only, no empty/redundant secondary line).
- [x] Renaming to blank/whitespace clears the nickname (stored as `null`,
      falls back to species name), not stored as an empty string.
- [x] A rename request for a Pokémon you don't own is rejected server-side.
- [x] `npm run build` / `npm run lint` clean.

### Validation notes (2026-08-08)

- `npm run build` and `npm run lint` both clean.
- This step needed a real schema change (`pokemon_instances.nickname`) —
  pushed to `origin/main` (confirmed with the user first) and let the
  Supabase GitHub integration apply it, same as step 5. Confirmed applied
  by querying the live table directly before running any other checks.
- Ran a temporary end-to-end validation (deleted after running) against a
  local dev server pointed at the now-migrated live Supabase project, using
  2 disposable test accounts and 2 directly-inserted `pokemon_instances`
  rows (Mewtwo to be nicknamed, Mew left as an un-nicknamed control) — 16
  checks, all passing: `PATCH` rename succeeds and persists in the DB
  (verified directly, not just via the API response); a reload
  (`GET /inventory`) shows the nickname as the grid card's primary label
  with `#150 Mewtwo` kept as a secondary line; the un-nicknamed control
  shows only its species name, with no redundant secondary line rendered
  for it; whitespace-only input clears the nickname to `null` in the DB,
  not `""`; a non-owner's rename attempt is rejected with 404 and doesn't
  touch the row; a 25-character nickname is rejected with 400; the
  Dashboard's top-3 team preview correctly shows the nickname as primary
  label with the species line secondary when that instance is one of the
  account's top 3 by total stats.
- Not independently verified via a real browser (no browser automation
  tool available in this environment): the two battle arenas'
  (`FighterCard.tsx`) active-title and bench-member nickname display. Both
  were refactored to share the same `displayName()` helper and
  `#{number} {name}` secondary-line pattern already confirmed working on
  Inventory and Dashboard above, and the component code was reviewed by
  hand — but no live battle was actually played through a browser to watch
  a nicknamed Pokémon's name during combat, consistent with the same
  browser-automation gap noted in step 5's validation.
