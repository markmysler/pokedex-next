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

- [ ] A Pokémon can be renamed from the Inventory detail panel; the new
      name persists across a reload.
- [ ] The nickname (when set) shows as the primary label in: inventory
      grid, inventory list, inventory detail panel, both battle arenas
      (active + bench), and the dashboard team preview — with the species
      name/number still visible as secondary context.
- [ ] An un-nicknamed Pokémon still shows exactly as it does today (species
      name only, no empty/redundant secondary line).
- [ ] Renaming to blank/whitespace clears the nickname (stored as `null`,
      falls back to species name), not stored as an empty string.
- [ ] A rename request for a Pokémon you don't own is rejected server-side.
- [ ] `npm run build` / `npm run lint` clean.
