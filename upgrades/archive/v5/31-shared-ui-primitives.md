# Step 31: Shared UI primitives — buttons, inputs, chips, meters, card tabs

**Status: shipped**, 2026-08-19.

## Why here

Depends on 30 (tokens must exist first). Every page in steps 33–38 wires
these primitives in rather than reinventing them — building them once,
now, means the per-page steps are pure wiring, not design decisions.

This step introduces two genuinely new reusable **components** (not just
CSS): the segmented meter and the "bezel tab" card header, both used
across nearly every screen. Everything else in this step is a CSS-class
restyle of existing markup.

## What changes

### New component: `components/ui/SegmentedMeter.tsx`

Replaces the smooth-gradient `.progress-fill` / `.stat-bar-fill` pattern
with the segmented, device-readout meter from `design/DESIGN_SYSTEM.md`
§5.

```tsx
interface SegmentedMeterProps {
  label: string;       // "HP", "ATK", etc.
  value: number;
  max: number;
  segments?: number;   // default 10
  color: string;        // CSS color for lit segments
  mono?: boolean;       // render the numeric readout in --font-mono (default true)
}
```

Renders the label, a track of `segments` divs (lit proportionally to
`value/max`, rounding down — partial fill within a single segment is not
attempted, matching the blocky device aesthetic), and a `value/max`
numeric readout. One component, reused by:
- `FighterCard.tsx` (HP + MP, both active and bench-compact variants)
- `PokemonDetail.tsx` / `InventoryPageClient.tsx`'s stat rows (6 base
  stats, `segments=10`, color per `STAT_INFO`)
- `LootboxRevealDialog.tsx`'s staggered stat reveal (needs a
  `revealed?: boolean` prop — when false, renders the track unlit and
  hides the numeric value, matching the existing reveal animation)

### New component: `components/ui/CardTab.tsx`

The overlapping icon-chip + eyebrow-label tab from §4.

```tsx
interface CardTabProps {
  icon: string;   // emoji
  label: string;
  color?: string; // chip background, defaults to var(--accent)
}
```

Renders the `<span class="card-tab">` structure from the artifacts.
Replaces the current convention of an inline-emoji `<h3>` as the first
child of a `.card` — e.g. `<h3>📊 Base Stats</h3>` becomes
`<CardTab icon="📊" label="Base stats" />` followed by the existing
content. Consumers (non-exhaustive, exact list finalized per-step as
33–38 touch each file): Pokédex/Inventory detail (stats, moves, notes),
Dashboard's four cards, Friends (code, add-friend, incoming/outgoing,
friends list), Friend chat (trades, chat), FighterCard's moves caption.

### CSS restyle in `app/globals.css` (no new components)

- **Buttons**: `.btn-primary`/`.btn-secondary` get pill radius
  (`--r-pill`), display-face label, the accent glow shadow on primary.
  Add `.btn-ghost` and `.btn-danger` (new — not in today's CSS; needed
  by the Inventory discard button and a few destructive actions that
  currently misuse `.btn-secondary`).
- **Inputs/selects/search**: `--r-md` radius, `--border-strong`,
  accent focus ring via `box-shadow`. Fix the search-icon vertical
  centering bug from the Design System artifact review (`.search::before`
  gets an explicit flex box, not just `top:50%`/`translateY`) — same fix,
  applied here to the real `#search-input` styling this time.
- **Chips/pills**: `.type-badge` (rename conversation: keep the class
  name to avoid touching `TypeBadges.tsx`'s className, just restyle),
  `.caught-badge`, `.shiny-badge`, `.status-badge` (recolor per §6's
  semantic mapping — buff/debuff/shield/redirect move off the old ad hoc
  hex values onto `var(--good)`/`var(--bad)`/`var(--info)`/`var(--warn)`).
- **Move buttons** (`.move-btn`): damage moves keep type-color fill;
  buff/debuff/drain/redirect move onto the semantic palette per §6 — this
  touches `MoveButton.tsx`'s `KIND_COLOR` map (TS, not CSS) alongside the
  CSS pass, since that's where those hexes currently live.
- **Modal**: `--r-xl`, `--shadow-2`, new radius/padding scale.
- **Toast**: apply the sizing fix from the Design System artifact review
  — `.toast-stack` gets `align-items: flex-end`, `.toast-card` gets
  `width: fit-content` so it sizes to content instead of stretching to
  match its flex container.
- **Battle log** (`.battle-log`): apply the theme-color fix — background
  `var(--surface-3)`, text `var(--ink)` (not a hardcoded dark value), so
  it's dark-screen/light-text in dark mode and flips correctly in light
  mode. `.log .win`/`.log .hit`-equivalent highlight spans (if/when the
  log gains inline highlighting — not required by this step, just don't
  block it) keep fixed accent colors regardless of theme.

## End state

- [x] `components/ui/SegmentedMeter.tsx` and `components/ui/CardTab.tsx`
      exist, typed, with no consumers wired yet (that's steps 33–38) — a
      throwaway usage temporarily dropped into `/login` (reverted before
      commit) rendered correctly in both themes.
      (Implementation note: `CardTab`'s inner icon-chip element is
      `.card-tab-chip`, not the artifact's generic `.chip`, to avoid
      claiming an unscoped class name in the real stylesheet.)
- [x] `.btn-primary/secondary/ghost/danger`, inputs, all chip/pill
      classes, `.move-btn`, `.modal-*`, `.toast-*`, `.battle-log` match
      the Design System artifact 1:1 (colors, radius, shadow).
      (Implementation notes:
      — `.btn-primary`/`.btn-secondary`/`.btn-ghost`/`.btn-danger` stayed
      four self-contained rules rather than a shared `.btn` base class,
      since every real consumer already passes a single className
      directly (e.g. `className="btn-primary"`) — adding a `.btn` base
      would have meant touching every button call site across the app,
      out of scope for a primitives-only step.
      — `.caught-badge.caught` went to the soft `--good-bg`/`--good`
      pairing (not `--accent`) — "caught" is the same semantic concept as
      a win/high-HP per `DESIGN_SYSTEM.md`'s own token table, and this is
      the step explicitly named for that recolor in the plan; step 30's
      interim `--accent` value for it was always meant to be superseded
      here, not a miss.
      — `.status-badge.buff/debuff/shield/redirect` and
      `MoveButton.tsx`'s equivalent `KIND_COLOR` entries pair their
      background with `var(--accent-ink)`, not a literal white: `--good`/
      `--bad`/`--info`/`--warn` all run bright in dark theme (meant to
      read as colored highlights against dark surfaces), so fixed white
      text would fail contrast there even though it's fine in light theme
      — `--accent-ink` already encodes exactly that "dark text on a
      bright token, light text on a muted token" flip. Caught during this
      step's own implementation, not present in the reviewed mockups —
      documented in `app/globals.css`'s comments and
      `upgrades/main.md`'s key decisions so it isn't lost.
      — `drain`'s move-kind color maps to `--info` and `redirect` to
      `--warn` — the Design System doc names the four semantic tokens but
      doesn't spell out which move-kind gets which; this pairing keeps
      `redirect` consistent with its status-badge counterpart (both
      "confused") and gives `drain` the mana/life-steal-adjacent `--info`
      hue, the only reasonable pairing left for the remaining two slots.)
- [x] Search input icon is vertically centered (visually verified via
      screenshot, not just via `top:50%`) — and, going further than the
      original plan, actually wired into the two real search inputs
      (`PokemonFilterBar.tsx`, `PokedexPageClient.tsx`) via a new `.search`
      wrapper div, replacing the old placeholder-embedded 🔍 (which
      disappeared once the field had any text — a real UX bug beyond the
      centering issue, fixed for free by switching to an overlay icon).
- [x] Toast card in a manual test (a static markup rendering of the same
      `.toast-stack`/`.card.toast-card` classes `Toast.tsx` produces,
      temporarily on `/login`, reverted before commit) is only as tall/wide
      as its content, not stretched.
- [x] `npm run build` and `npm run lint` clean.
- [x] Manual pass in both themes via Playwright screenshots of the
      temporary `/login` test markup (reverted before commit): buttons
      (primary/secondary/ghost/danger/disabled), type/caught/shiny chips,
      all four status-badge kinds, the segmented meter, the search icon,
      a modal, and a toast — all legible with correct contrast in both
      themes, zero console errors. No leftover hardcoded hex from the old
      status-badge colors for the four semantic-mapped kinds (bleed/
      blind/poison/burn/freeze intentionally keep their own fixed hues
      per `DESIGN_SYSTEM.md` §6, untouched).
