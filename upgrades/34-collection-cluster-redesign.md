# Step 34: Collection cluster — Pokédex, Inventory, Lootbox reveal

**Status: shipped**, 2026-08-19.

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

- [x] Pokédex and Inventory both render `SegmentedMeter` for every stat
      row (6 base stats) — no `.stat-bar-fill` usages left in either
      component (nor in `LootboxRevealDialog`, which also migrated).
      HP/MP meters weren't touched — those only exist in the Battle
      cluster (`FighterCard`), out of scope until step 35.
- [x] Every `.card` header in both pages uses `CardTab`: Pokédex's Base
      Stats/Trainer Notes, Inventory's lootbox banner/Stats/Moves. The
      two identity-style `#card-header`s (Pokémon name + type badges +
      caught badge) intentionally stay plain `<h2>`s per the plan — same
      exemption already established for the Account cluster's headers.
- [x] Below 900px, both pages show single-pane list/grid; tapping an
      entry opens a full-screen detail view (`.mobile-detail-open` on
      `.inventory-layout`) with a working `.detail-back-btn` back action;
      `selectedId` state is otherwise unchanged — verified live: tap →
      full-screen detail → back → list restored, both pages, both themes.
- [x] Inventory's lootbox banner (`.lootbox-hero`) reads as a distinct
      gold-bordered/gradient-tinted "hero" element, not a plain card;
      verified with the single-lootbox state (this test account only
      ever had 1 lootbox at a time, so the batch-stepper variant was
      verified by reading the JSX/CSS rather than live-screenshotted —
      both states share the same `.lootbox-hero` wrapper and `CardTab`
      header, so there's no batch-specific styling to separately confirm).
- [x] Lootbox reveal dialog's staggered stat/move reveal still paces the
      same way — `SegmentedMeter`'s `revealed` prop now drives each
      stat row's on/off state at the same `STAT_STEP_MS` cadence the old
      width animation used; verified live end-to-end (drumroll → sprite →
      stats → moves → Continue) with no timing regression.
- [x] Both pages verified in both themes, desktop split-pane and mobile
      full-screen-detail, via Playwright against the real running app
      (fresh disposable signup — new accounts start with 1 starter + 1
      lootbox per `20260808060000_signup_lootbox.sql`, which was enough
      to exercise the whole flow including a live lootbox open).
- [x] `npm run build` and `npm run lint` clean; zero console errors
      across the whole flow.

### Implementation notes

- **Mobile detail-open pattern extracted as planned**: both pages toggle
  the same `mobile-detail-open` class on `.inventory-layout`, driven by
  a local `mobileDetailOpen` boolean that's set `true` on entry-select
  and `false` on back/discard — the CSS breakpoint logic lives once in
  `globals.css`, not duplicated per page. Deliberately *not* extracted
  into a shared React component: the two detail panels' internals differ
  enough (Pokédex's is a stack of separate `.card`s incl. notes;
  Inventory's is one `.card` with rename/discard) that a wrapper would
  mostly just be prop-drilling children through — the plan explicitly
  allowed skipping this.
- **Found via live-test, not spec**: setting `mobileDetailOpen` on select
  works on any breakpoint (state is inert on desktop since the CSS only
  activates <900px), which seemed elegant — until the validation script
  clicked an entry at desktop width, *then* resized to mobile, and got a
  full-screen detail overlay covering the toolbar instead of the list.
  That's correct behavior for a live window resize (the detail really is
  selected), but it's not how a mobile user actually arrives at the page
  — they load fresh, so `mobileDetailOpen` starts `false`. Fixed the test
  to `page.goto()` again before switching to the mobile viewport rather
  than resizing mid-session; no code change needed, just confirms the
  state model matches real usage.
- **Lootbox hero uses `color-mix()`** for the gradient tint
  (`color-mix(in srgb, var(--accent-2) 20%, var(--surface))`) rather than
  a hardcoded rgba overlay, so it derives from the current surface token
  automatically in both themes instead of needing separate light/dark
  hero recipes. Confirmed rendering correctly in both themes via
  Playwright/Chromium (Baseline-supported).
- **Starter badge is a new outlined pill** (`--accent` border, transparent
  fill), deliberately distinct from `.shiny-badge`'s solid gold fill so a
  starter *and* shiny instance (possible, if rare) shows two legible
  badges side by side instead of one fighting the other for the same
  visual weight.
- **Shiny reveal panel treatment (gold border + radial glow + sprite
  drop-shadow) wasn't hit by live RNG** — the one lootbox this test
  account had access to rolled non-shiny. Confirmed correct by reading
  the rendered CSS/class wiring and by direct comparison against the
  already-live-verified `.sprite-col-shiny` treatment in the Pokédex
  detail view, which uses the identical gold values and technique.
- **`.meter`'s label column widened 48px → 56px→58px**: this is the first
  page-level consumer of `SegmentedMeter` with real stat labels ("Sp.
  Def" etc.) — the original width (set in step 31 with no consumer yet)
  was too tight and would have wrapped. Safe to adjust since nothing
  depended on the old value.
- **`.progress-bar`/`.progress-fill` intentionally left untouched at the
  base level** — only added `.completion` modifier classes for the
  Pokédex banner's pill/gradient look, so the battle HP/MP bars (still
  using the unmodified base classes until step 35/36 migrate them to
  `SegmentedMeter`) aren't affected by this step.
- `.stat-row`/`.stat-bar-track`/`.stat-bar-fill` CSS rules are now dead
  (no component references them) but were deliberately left in
  `globals.css` — the dead-CSS sweep is explicitly step 39's job.
