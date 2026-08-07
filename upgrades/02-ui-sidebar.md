# Step 2: UI upgrades (sidebar redesign)

## Why here

Purely a frontend change with no schema or API impact — it doesn't depend on anything and nothing later depends on it. Placed here as a low-risk, self-contained step between the two big backend reworks (auth, 3v3).

## What changes

Scoped to `components/pokedex/Sidebar.tsx` (and `PokedexApp.tsx` only if layout changes require it). The current sidebar is a flat scrollable list with filter controls on top — functional but not pleasant to use with ~150 entries.

Concrete ideas (pick what's worth it, this isn't a strict spec):
- Sprite thumbnails next to each list entry, not just the name/number.
- Group or visually separate "caught" vs "not caught" instead of relying only on a filter toggle.
- Sticky filter bar so it doesn't scroll away with the list.
- Clearer active/selected state for the currently-viewed Pokemon.
- Consider whether the current filter set (search, type, status, min-stat) still makes sense or needs consolidating into fewer controls.

No backend involvement: filters continue to operate on data already loaded client-side (`lib/pokedex.ts` static data + `userData` fetched from `/api/user-data`).

## End state

- [ ] Sidebar remains fully keyboard/mouse navigable and every existing filter (search, type, status, min-stat) still works.
- [ ] Selecting a Pokemon in the redesigned sidebar still drives `PokemonDetail` the same way it does today (including the `key`-based remount behavior — don't reintroduce a stale-notes bug).
- [ ] No regressions in `npm run build` / `npm run lint`.
- [ ] Visually confirmed in a browser at both a small viewport (mobile-ish width) and a normal desktop width.
