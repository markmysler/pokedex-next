# Step 4: App shell & navigation (dashboard, hamburger nav, inventory/pokedex/history/profile pages)

## Why here

This is "wire it all into the UI," not "invent new mechanics" — it needs step 2's inventory data and step 3's working battle flows to have anything real to display. Building the dashboard before those exist would mean shipping it with fake data and redoing it.

## What changes

### Routing
Today's app is a single route (`/`) with client-side tab state (`PokedexApp.tsx`'s `activeTab`). This becomes real routes under a shared layout: `/dashboard`, `/inventory`, `/pokedex`, `/battle`, `/online`, `/history`, `/profile`. `/` redirects to `/dashboard`. `PokedexApp.tsx` is retired — its content splits across the pages below.

### Shared shell
- New `app/(app)/layout.tsx` (route group) — renders the persistent side nav plus `{children}`.
- New `components/nav/SideNav.tsx` — hamburger toggle on small viewports, links to all 7 destinations (Dashboard, Inventory, Pokedex, Battle, Online, History, Profile), `SignOutButton` (from step 1) pinned at the bottom.

### Pages
- `app/(app)/dashboard/page.tsx` — Server Component: a snapshot of the account's Pokémon (see "active team" note below), the last N `match_results` rows (step 3), aggregate win/loss counts split by bot vs online.
- `app/(app)/inventory/page.tsx` — owned `pokemon_instances` + unopened `lootboxes` (step 2). Filter/search (species name/number/type — same filter shape as today's Sidebar), a grid/list view toggle, click an instance for a detail view (stats, moves, discard button), click a lootbox to open it.
- `app/(app)/pokedex/page.tsx` — all 151 species, read-only reference (today's `PokemonDetail` content, ported as-is), same filter/search, grid/list toggle added. "Caught" indicator reflects `pokemon_instances` ownership (step 2), not a manual toggle.
- `app/(app)/battle/page.tsx` — hosts the reworked `BattleArena` (step 3), unchanged from what step 3 already built.
- `app/(app)/online/page.tsx` — hosts the reworked `OnlineBattle` (step 3), unchanged from what step 3 already built.
- `app/(app)/history/page.tsx` — a simple list of the account's `match_results` rows (opponent, mode, win/loss, date). Deliberately placeholder-grade — the full per-match detail view and public leaderboard is step 7.
- `app/(app)/profile/page.tsx` — display name (editable, writes to `profiles` from step 1), email (read-only), sign out.

### "Active team" — a default worth confirming once built
Battling draws from inventory, but there's no persisted "this is my current team" flag anywhere. Simplest option, used here by default: don't persist one — each battle page lets you pick from inventory every time you enter it (same per-battle-selection UX as today), and the Dashboard shows a representative snapshot (e.g. your 3 highest-`total` instances, or your most-recently-battled-with instance) rather than a stored selection. Revisit if this feels wrong once it's actually in front of you — adding a persisted "active team" later is a small, additive change, not a rework.

### New shared components
`components/nav/SideNav.tsx`, an inventory grid/list pair (or one component with a view-mode prop) under `components/inventory/`, `components/inventory/PokemonInstanceCard.tsx`, `components/dashboard/*`.

### CSS
The biggest visual change in the whole roadmap — new layout for the side nav, grid/list toggle, and dashboard widgets. Reuse the existing `--bg-*`/`--text-*` theme variables from `globals.css` rather than introducing a second design language; keep dark/light theme support working everywhere.

## End state

- [ ] Every nav link works, including on a small viewport (hamburger collapses/expands the nav).
- [ ] Dashboard shows real data: at least one recent match after playing a battle, and win/loss counts that update after new battles.
- [ ] Inventory shows only owned instances + lootboxes, supports search/filter and both grid and list view, and discarding/opening from here updates the list without a full page reload.
- [ ] Pokedex still shows all 151 species with correct derived "caught" status, and also supports grid/list view.
- [ ] Battle and Online pages work exactly as validated in step 3, just reachable via the new nav instead of tabs.
- [ ] Profile page updates the display name and it's reflected immediately elsewhere in the UI (e.g. the nav).
- [ ] `npm run build` / `npm run lint` clean; manually click through every nav destination in a browser, both themes.
