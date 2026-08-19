# Upgrade Path

Fifth wave: **a full visual redesign of every screen** — a modern,
Pokémon-inspired, UX-friendly, fully responsive restyle, requested
2026-08-19 with no active wave running (the fourth wave, the
attack-system rework in [archive/v4/main.md](archive/v4/main.md), shipped
in full on 2026-08-14; it followed
[archive/v3/main.md](archive/v3/main.md) (5 steps), which followed
[archive/v2/main.md](archive/v2/main.md) (15 steps), which followed the
original 8-step plan in [archive/main.md](archive/main.md)).

This wave is design-first: before any code changed, a full design pass
produced five reviewed mockup artifacts (desktop + mobile, both themes)
covering all 13 screens and every shared component, plus two docs that
are the source of truth for the steps below:

- **[design/DESIGN_SYSTEM.md](../design/DESIGN_SYSTEM.md)** — the
  implementation-ready token/component spec (palette, type, spacing,
  radius, meters, nav, battle log). Read this alongside whichever step
  you're implementing; the steps below reference its sections rather
  than repeating every value.
- **[design/REDESIGN_TRACKER.md](../design/REDESIGN_TRACKER.md)** —
  per-*screen* design status (all 13 screens + shared components already
  🎨 Designed) and links to the 5 mockup artifacts. That file tracks
  "has this screen's design been reviewed"; **this file tracks
  implementation** — the two are complementary, not duplicates. Step 39
  flips `REDESIGN_TRACKER.md`'s rows to ✅ Done as implementation is
  verified.

No re-scoping happened during design: same 13 routes, same features,
same libraries — this is a visual and interaction-density rework, not a
product-scope change. The one real interaction-model change is
navigation (step 32): the current hamburger-drawer nav becomes a fixed
desktop rail + mobile bottom-tab-bar.

**Progress: steps 30–34 shipped 2026-08-19** (design tokens in
`app/globals.css`/`lib/typeData.ts`; shared primitives — buttons, inputs,
chips, the new `SegmentedMeter`/`CardTab` components, and the Modal/Toast/
battle-log fixes — also in `app/globals.css` plus
`components/ui/SegmentedMeter.tsx`, `components/ui/CardTab.tsx`,
`components/battle/MoveButton.tsx`, and the two real search-input
consumers; the navigation shell rework — `components/nav/SideNav.tsx`
rewritten to a desktop rail + mobile bottom-tab-bar + "More" sheet; the
Account cluster — Dashboard's new stat strip + `CardTab` headers, and
Profile's avatar header + code-plate friend code, both wired for real;
the Collection cluster — Pokédex and Inventory both wired with
`SegmentedMeter`/`CardTab`, the shared mobile split-pane →
full-screen-detail pattern, Inventory's gold `.lootbox-hero` banner and
`.btn-tradeup` button, and `LootboxRevealDialog`'s stat rows migrated to
`SegmentedMeter` with its `revealed` prop driving the existing stagger.
All five verified via `npm run build`/`npm run lint` and Playwright —
steps 30–31 via screenshots of a throwaway component gallery, steps
32–34 via live disposable-account click-throughs (real signup, real
navigation, a real profile save, a real lootbox open, zero console
errors) since neither a nav rework nor an authenticated page can be
meaningfully verified without a session. See each step file's End state
notes). Steps 35–39 not started.

| # | Step | File | Depends on |
|---|------|------|------------|
| 30 | ✅ Design tokens & global foundations (palette, type, spacing/radius/shadow scale) | [30-design-tokens-and-foundations.md](30-design-tokens-and-foundations.md) | — |
| 31 | ✅ Shared UI primitives — buttons/inputs/chips, `SegmentedMeter`, `CardTab`, Modal/Toast fixes | [31-shared-ui-primitives.md](31-shared-ui-primitives.md) | 30 |
| 32 | ✅ Navigation shell — desktop rail + mobile bottom tabs | [32-navigation-shell-rework.md](32-navigation-shell-rework.md) | 30, 31 |
| 33 | ✅ Account cluster — Login, Signup, Dashboard, Profile | [33-account-cluster-redesign.md](33-account-cluster-redesign.md) | 30, 31, 32 |
| 34 | ✅ Collection cluster — Pokédex, Inventory, Lootbox reveal | [34-collection-cluster-redesign.md](34-collection-cluster-redesign.md) | 30, 31, 32 |
| 35 | Battle shared components — FighterCard, MoveButton, AllyTargetPicker, BattleResultDialog | [35-battle-shared-components-redesign.md](35-battle-shared-components-redesign.md) | 30, 31 |
| 36 | Battle Arena page + Team Picker — bot battle wiring | [36-battle-arena-and-team-picker-redesign.md](36-battle-arena-and-team-picker-redesign.md) | 32, 35 |
| 37 | Online Battle page — room setup, chat, rematch wiring | [37-online-battle-redesign.md](37-online-battle-redesign.md) | 35, 36 |
| 38 | Social & progression cluster — Friends, Trade/Chat, Notifications, History, Leaderboard | [38-social-cluster-redesign.md](38-social-cluster-redesign.md) | 30, 31, 32 |
| 39 | Full responsive + theme QA pass, doc reconciliation, archive the wave | [39-responsive-theme-qa-pass.md](39-responsive-theme-qa-pass.md) | 33, 34, 35, 36, 37, 38 |

## Why this order

- **30 (tokens) has to come first** — every class in `app/globals.css`
  that any later step touches reads from these custom properties.
- **31 (shared primitives) before anything page-level** — `SegmentedMeter`
  and `CardTab` are new components used by nearly every screen; building
  them once and wiring them per-page in 33+ avoids reinventing either
  mid-page-step.
- **32 (nav shell) before any page-wiring step** — every page in 33–38
  renders inside it; doing it after 30/31 (so nav links/buttons already
  read the new tokens) but before real page content means each later
  step is tested in its final navigation context from the start.
- **33 (Account) is the first page-level step, deliberately the smallest
  surface** — 4 mostly form-shaped screens, no data grids or battle
  state, to validate the shell + primitives hold up before the bigger
  clusters.
- **34 (Collection) next** — the densest data screens (151-entry lists,
  stat blocks), first real test of `SegmentedMeter` at scale and of the
  split-pane → full-screen-detail responsive pattern nothing before it
  needed.
- **35 (battle shared components) before either battle page** —
  `FighterCard`/`MoveButton`/`AllyTargetPicker`/`BattleResultDialog` are
  rendered identically by both `/battle` (36) and `/online` (37); doing
  the component work once avoids duplicating it across both page steps.
- **36 (bot battle) before 37 (online battle)** — bot battle has no
  realtime/room-state complexity, so if the new arena responsive layout
  or battle-log theming has a bug, it surfaces here first, not tangled
  up with Realtime/polling sync issues online battle alone can produce.
- **37 depends on 36** — reuses its `TeamPicker` wiring and arena
  responsive layout directly, only adding what's unique to online (room
  setup, waiting room, chat, rematch).
- **38 (Social cluster) only depends on 30–32**, independent of the
  battle cluster — ordered last among page-wiring steps because it's
  almost entirely list-shaped screens reusing patterns already proven in
  33/34, the lowest-risk remaining surface.
- **39 (QA pass) last** — every screen has been individually verified by
  its own step, but nothing so far looked at the app as a whole
  (cross-page spacing consistency, dead CSS, `WelcomeDialog`/toast
  content that isn't tied to one cluster, the full theme×breakpoint
  matrix) or reconciled the two design docs against what actually
  shipped.

## Key decisions made

From the 2026-08-19 design pass and planning conversation:

- **Design-first, with reviewed artifacts before any code.** All 13
  screens + shared components were mocked up (desktop + mobile, both
  themes) across 5 artifacts before this step plan was written — see
  `design/REDESIGN_TRACKER.md` for the links. Implementation steps below
  cite `design/DESIGN_SYSTEM.md` sections rather than re-deriving values.
- **Direction: warm device-inspired neutrals + one bold accent**, not the
  generic blue-purple "AI dark mode." Poké Red (`--accent`) is the only
  accent color — used for primary actions and active nav state, nowhere
  else. Semantic color (win/warn/danger/info) is a deliberately different
  hue family so it never competes with the accent. The 18 Pokémon type
  colors stay categorical data, refined only for contrast.
- **Segmented, Game Boy–style meters replace smooth gradient bars** for
  HP/MP/base stats — a new `SegmentedMeter` component, not a CSS-only
  change, since it needs per-segment markup.
- **Every card gets a "bezel tab" header** (icon chip + mono eyebrow
  label overlapping the top edge) via a new `CardTab` component,
  replacing the inline-emoji `<h3>` convention used throughout the
  current app.
- **Emoji-as-iconography is kept, not replaced with an icon font** —
  deliberate for tone, standardized via icon-chip treatments rather than
  floating inline.
- **Navigation breakpoint moves from 720px to 900px**, and the
  interaction model changes from a hamburger/slide-over drawer to a
  fixed rail (desktop) / bottom tab bar + "More" sheet (mobile) — a
  5-item tab bar needs more width to stay thumb-sized than a hidden
  drawer did, and doesn't comfortably fit today's 10-item link list
  without an overflow menu.
- **Two-pane list+detail screens (Pokédex, Inventory) drop to a
  full-screen detail view below 900px** instead of compressing both
  panes — selecting an entry pushes a back-navigable detail screen.
- **Three bugs found during design review got fixed in the mockups
  before implementation started** (documented here so the fixes aren't
  silently reintroduced): the search-icon was centered against its own
  pseudo-element line box instead of a fixed glyph box (fixed via an
  explicit flex box); the toast card was stretching to match a CSS grid
  row's height instead of sizing to content (fixed via `align-items:
  flex-end` + `width: fit-content`); the battle log's background was
  hardcoded to `var(--ink)`, which flips *opposite* of what's wanted
  (illegible light-on-light in dark mode) — fixed to `var(--surface-3)`/
  `var(--ink)` so it correctly follows the active theme. See step 31 and
  `DESIGN_SYSTEM.md`'s "Battle log" bullet.
- **No new libraries, no new build tooling.** Same custom-CSS-in-
  `globals.css` + React approach as every prior wave — `Modal`/`Toast`
  keep their existing structural model, just restyled.
- **A fourth contrast bug, not present in the mockups, was caught while
  implementing step 31**: pairing `--good`/`--bad`/`--info`/`--warn`
  directly with literal white text (as the reviewed status-badge mockup
  did) fails in dark theme, where all four tokens run bright/light by
  design (meant to read as colored highlights against dark surfaces).
  Fixed by pairing them with `--accent-ink` instead, which already
  encodes the same "dark text on a bright token, light text on a muted
  token" flip under an accent-flavored name — applied to
  `.status-badge.buff/debuff/shield/redirect` and `MoveButton.tsx`'s
  matching `KIND_COLOR` entries. No new token was introduced for this;
  `--accent-ink`'s values happen to be exactly what's needed.
- **The search-icon fix went further than planned**: rather than just
  restyling `#search-input`'s CSS, step 31 introduced a real `.search`
  wrapper (icon as a permanent overlay) and removed the 🔍 emoji from the
  two real placeholder strings it was embedded in
  (`PokemonFilterBar.tsx`, `PokedexPageClient.tsx`) — the placeholder
  approach had its own bug beyond centering: the icon disappeared the
  moment the field had any text, since it was part of the placeholder.
- **Mobile's 4 dedicated tabs are Dashboard/Inventory/Pokédex/Battle**
  (step 32) — the routes a trainer reaches for constantly — with the
  other 6 (Online, Friends, Notifications, History, Leaderboard, Profile)
  behind "More." The "More" tab itself highlights as active when the
  current route is one of those six, not just when the sheet is open, so
  the tab bar never shows zero tabs lit while on a real page.
- **Step 32 was verified with a live disposable account**, not just a
  static render — same precedent v4's step 21 set (see `archive/v4/
  main.md`): a nav rework only really proves itself by actually
  navigating through it post-login, which needs a real session. Signed up
  `step32-nav-test-*@example.com` (this Supabase project doesn't require
  email confirmation), clicked every rail link and every mobile
  tab/sheet link, toggled theme/sound, confirmed zero console errors, and
  left the throwaway account in place afterward (no deletion flow exists
  in-app, and an empty test account isn't harmful to leave — unlike v4's
  step 21, which was validating against data-mutating battle/lootbox
  flows on what was explicitly called out as the production database).
  Step 33 followed the same live-account approach for the same reason
  (Dashboard/Profile are both authenticated-only) and additionally
  exercised the real `PATCH /api/profile` save flow, not just a render.
- **`.friend-code-display`'s "code plate" restyle (step 33) is a single
  shared class**, not a per-page copy — Profile (step 33), Friends (step
  38), and Online's room-code display (step 37) all reuse it, so the
  dashed-border/mono/letter-spaced treatment stays visually identical
  everywhere a short alphanumeric code is meant to be read aloud or
  copied, without three near-duplicate CSS rules to keep in sync.
- **The mobile split-pane → full-screen-detail pattern (step 34) is a
  shared CSS contract, not a shared component.** Pokédex and Inventory
  both toggle one `mobile-detail-open` class on `.inventory-layout`,
  and the breakpoint logic (hide list, fixed-position the detail pane,
  show `.detail-back-btn`) lives once in `globals.css`. A wrapper
  component was considered and skipped — the two pages' detail panels
  differ enough (Pokédex stacks several `.card`s including a notes
  textarea; Inventory is one `.card` with inline rename/discard) that a
  shared component would mostly prop-drill children through without
  removing real duplication. Same pattern will apply to any future
  list+detail screen without re-deriving the breakpoint math.
- **`SegmentedMeter`'s label column (48px, set in step 31 with no
  consumer yet) was too narrow for real stat labels** ("Sp. Def" etc.) —
  widened to 58px once step 34 became its first real page-level
  consumer. Worth knowing before wiring it into FighterCard's HP/MP
  (step 35): the column width is now tuned for stat-name-length labels,
  not the shorter "HP"/"MP" battle labels, but 58px comfortably fits
  both, so no further adjustment should be needed there.
- **Lootbox hero banner and the lootbox-reveal shiny panel both use a
  fixed gold treatment** (`#F0C15C`/`color-mix(... var(--accent-2) ...)`),
  matching `.shiny-badge`'s existing "rare item" convention of staying
  visually identical in both themes rather than flipping with theme
  tokens — consistent with why `.shiny-badge` itself isn't tokenized.

## Working through a step

1. Read the step's `.md` file in full before starting.
2. Implement it in isolation — don't pull in work from later steps even if
   it seems convenient.
3. Run through the **End state** checklist at the bottom of the step file.
   Every item should be verifiable by hand (`npm run build`, a browser
   check at a real viewport width, a theme toggle, etc.) — if an item
   can't be checked, the step isn't actually done.
4. Only move to the next step once its listed dependencies are checked off.
