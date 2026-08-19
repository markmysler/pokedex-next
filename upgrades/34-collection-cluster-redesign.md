# Step 34: Collection cluster — Pokédex, Inventory, Lootbox reveal

**Status: not started**

## Why here

The densest data screens (151-entry lists, stat blocks, move lists) —
first real test of `SegmentedMeter`/`CardTab` (from 31) at scale, and of
the "split pane → full-screen detail sheet" responsive pattern that nothing
in the Account cluster needed. Depends on 30, 31, 32.

Reference: `design/REDESIGN_TRACKER.md`'s Collection cluster artifact.

## What changes

### Pokédex (`components/pokedex/PokedexPageClient.tsx`, `PokemonDetail.tsx`, `CompletionBanner.tsx`)

- `CompletionBanner.tsx`: restyle the progress track to the new
  `--r-pill`/gradient-fill treatment from the mockup (this one stays a
  smooth fill, not segmented — it's a completion percentage, not a
  device stat, per the mockup).
- `PokemonDetail.tsx`: base-stats block converts to 6× `SegmentedMeter`.
  Card headers (`#card-header`'s caught badge stays, but "📊 Base
  Stats"/"📝 Personal Trainer Notes") become `CardTab`. Sprites card
  (normal/shiny side-by-side) restyled per mockup's `.sprite-col`
  treatment, same underlying `Sprite` component/props.
- `PokedexPageClient.tsx`: **responsive behavior change** — below 900px,
  `.inventory-layout`'s two-pane grid (list/grid + detail) collapses to
  single-pane; selecting a Pokémon pushes a full-screen detail view with
  a back affordance instead of showing a second, squeezed pane. This is
  the same pattern needed by Inventory below, so consider extracting the
  responsive list/detail container as a shared layout piece (implementer's
  call — a shared component isn't required if the two pages' detail
  panels differ enough to make it awkward, but don't duplicate the
  breakpoint logic if it's easy not to).

### Inventory (`components/inventory/InventoryPageClient.tsx`, `PokemonInstanceCard.tsx`)

- Lootbox banner becomes the gold-tinted hero card from the mockup
  (`linear-gradient` using `--accent-2`) instead of a plain `.card` —
  applies to both the single-lootbox and batch-stepper variants.
  "🔥 Trade Up" gets its own visually distinct button rather than
  sharing the view-toggle row (already structurally separate in the
  current markup, just needs restyling + maybe a layout tweak to make
  the grouping clearer).
- Detail panel: same `SegmentedMeter`/`CardTab` treatment as Pokédex's
  stat block. Discard button becomes `.btn-danger` (new class from 31).
- `PokemonInstanceCard.tsx`: grid/list card restyle only (rounded card,
  shiny/starter pill treatment) — no prop/behavior changes.
- Same responsive split-pane → full-screen-detail pattern as Pokédex.

### Lootbox reveal (`components/inventory/LootboxRevealDialog.tsx`)

- Stat rows swap to `SegmentedMeter` with its `revealed` prop driving
  the existing staggered-reveal timing (phase state machine in this
  component is unchanged — only the stat row's own rendering changes,
  from raw `.stat-bar-fill` width animation to segment-by-segment
  lit/unlit based on `revealed`).
- Shiny state gets the gold-tinted panel border/sprite-background
  treatment from the mockup's "3 · Fully revealed (shiny)" frame.
- Modal sizing/padding via step 31's `Modal` restyle — no dialog-specific
  layout change otherwise.

## End state

- [ ] Pokédex and Inventory both render `SegmentedMeter` for every stat
      row (6 base stats + HP/MP where applicable) — no `.stat-bar-fill`
      usages left in either component.
- [ ] Every `.card` header in both pages uses `CardTab`.
- [ ] Below 900px, both pages show single-pane list/grid; tapping an
      entry opens a full-screen detail view with a working back action;
      the URL/selection state behavior (e.g. `selectedId`) is otherwise
      unchanged.
- [ ] Inventory's lootbox banner reads as a distinct "hero" element, not
      a plain card, in both single and batch-open states.
- [ ] Lootbox reveal dialog's staggered stat/move reveal still paces the
      same way (drumroll → sprite → stats → moves timings unchanged) —
      only the visual rendering of "revealed vs. not yet" changed.
- [ ] Both pages verified in both themes, desktop split-pane and mobile
      full-screen-detail.
- [ ] `npm run build` clean.
