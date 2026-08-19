# Pokédex — Design System

Reference spec for the visual redesign. Full interactive mockups live in the artifacts linked from `REDESIGN_TRACKER.md`; this file is the implementation-ready token/behavior reference for whoever writes the CSS.

**Direction**: warm, device-inspired neutrals (not the generic blue-purple dark-mode default) with one bold accent — Poké Red — and a segmented, Game Boy–style meter for HP/MP/stats instead of smooth gradient bars. Every panel wears a small overlapping "bezel tab" (icon chip + mono eyebrow label) instead of a generic rounded box with an inline icon. Mobile-first; desktop gets a fixed left rail, mobile gets a 5-item bottom tab bar instead of the current hamburger overlay.

## 1. Color tokens

Casing neutrals (light default / dark):

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#F4EFEC` | `#191215` | page background |
| `--surface` | `#FFFFFF` | `#241A1E` | cards |
| `--surface-2` | `#EAE1DC` | `#2E2125` | nested panels, inputs |
| `--surface-3` | `#DED2CB` | `#3A2A2F` | track/disabled backgrounds |
| `--ink` | `#241A1F` | `#F5EAE7` | primary text |
| `--ink-soft` | `#6E5D62` | `#C1AEB0` | secondary text |
| `--ink-faint` | `#9C8B8F` | `#8C767A` | captions, timestamps |
| `--border` / `--border-strong` | `#DED0C9` / `#C9B8B1` | `#3A2A2F` / `#4C383D` | hairlines / input borders |

Accent (brand — used for primary actions, active nav, focus rings, links to "the one bold color" — nowhere else):

| Token | Light | Dark |
|---|---|---|
| `--accent` (Poké Red) | `#C62A35` | `#FF5A57` |
| `--accent-2` (Dex Amber) | `#C97A1F` | `#F0A93E` |

Semantic (a **different** hue family from the accent, so "primary action" and "status" never collide):

| Token | Light | Dark | Meaning |
|---|---|---|---|
| `--good` | `#24875A` | `#3FDB8F` | win, caught, high HP |
| `--warn` | `#A96A0E` | `#F0B93E` | pending, low mana |
| `--bad` | `#C24422` | `#FF8A5B` | loss, error, danger |
| `--info` | `#2C69B8` | `#6FA6FF` | mana/MP, links |

Type colors (18, categorical data — kept close to the current `lib/typeData.ts` values, nudged only where needed for AA contrast on a white chip): Normal `#A8A878`, Fire `#EE8130`, Water `#6390F0`, Grass `#7AC74C`, Electric `#F0C93C`, Ice `#7FD4CF`, Fighting `#C22E28`, Poison `#A33EA1`, Ground `#D6B44A`, Flying `#A890F0`, Psychic `#F95587`, Bug `#9DB026`, Rock `#B6A136`, Ghost `#735797`, Dragon `#6F35FC`, Dark `#6C5B52`, Steel `#8E8EA6`, Fairy `#D685AD`.

Theme wiring: define tokens on `:root` (light default), redefine under `@media (prefers-color-scheme: dark)`, then redefine again under `:root[data-theme="dark"]` / `:root[data-theme="light"]` so the existing sidebar toggle keeps overriding OS preference in both directions — same mechanism as today's `app/globals.css`, new values only.

## 2. Typography

Three system-stack roles (no webfont dependency — this is a live product, not a one-off page):

- **Display** — `-apple-system, "Segoe UI Semibold", "Segoe UI", "Avenir Next", "Helvetica Neue", sans-serif`, weight 800, `letter-spacing: -0.01em`. Page titles, card titles, button labels.
- **Body** — `-apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`, weight 400–600. Copy, form labels, list rows.
- **Mono** — `"Cascadia Code", "SF Mono", Consolas, "Liberation Mono", Menlo, monospace`, `font-variant-numeric: tabular-nums`. Anything that reads like a device readout: stat numbers, HP/MP, dex numbers, room codes, the battle log.

Scale: 34/22 display, 16/14 body, 12 caption, 13 mono-data. Headings get `text-wrap: balance`.

## 3. Spacing, radius, elevation

- Spacing scale (gap/padding only — never stray margins): 4·8·12·16·20·24·32·40·56px.
- Radius scale: `--r-sm 8px` (chips) · `--r-md 12px` (inputs/buttons) · `--r-lg 16px` (cards) · `--r-xl 22px` (modals) · `--r-pill 999px` (pills/buttons).
- Elevation: `--shadow-1` for cards/nav, `--shadow-2` for modals/toasts — soft in light, deeper + darker in dark.

## 4. Structural device: the "bezel tab"

Every card gets a small pill overlapping its top-left edge: a 16–20px icon chip (solid accent or semantic color) + a mono, uppercase, letter-spaced eyebrow label, e.g. `📊 Base stats`. Replaces today's plain `<h3>📊 Base Stats</h3>` inline-emoji pattern everywhere: Pokédex/Inventory detail stat & moves panels, Dashboard cards, Friends/Trade panels, battle log header.

## 5. Meters (HP / MP / base stats)

Segmented bar, not a smooth gradient fill: a 10-cell row (6 for the compact bench-member size, where 9-12 read as illegible slivers at that width), each cell independently lit or unlit, colored per context (`--good`/`--warn`/`--bad` shifting as HP drops, `--info` for MP). Numeric readout in mono type to the right, tabular-nums. Applies to: Pokédex/Inventory stat blocks, Lootbox reveal, FighterCard HP/MP (active + compact bench sizes), AllyTargetPicker.

**Deviation from the original spec**: base-stat rows (Pokédex/Inventory/Lootbox reveal) keep the pre-existing fixed per-stat palette (HP/Atk/Def/Sp.Atk/Sp.Def/Speed each their own color — the standard "stat radar" convention) rather than the Pokémon's type color as first specified — that data was already wired this way before the redesign, reads correctly regardless of which two types a Pokémon has, and matches the mental model every other Pokémon game's stat screen already uses. Changing it would have been a data/behavior change disguised as a restyle, out of scope for a visual wave.

## 6. Components

- **Buttons** — pill radius, display-face label. `btn-primary` = solid accent w/ colored glow shadow; `btn-secondary` = surface-2 + border; `btn-danger` = outline in `--bad`. Padded `11px 18px` (~38px tall) for comfortable mobile tapping — a post-wave audit measured the original `8px 16px` at 33px, short of the target, so this was bumped. A fourth `btn-ghost` variant (dashed border, transparent) was planned alongside these three but never had a real consumer anywhere in the app; removed rather than shipped as dead CSS.
- **Inputs** — 1.5px border, `--r-md`, accent focus ring (`box-shadow` halo, not just outline color).
- **Type chips** — unchanged concept from today (pill, white text, type color fill), refined for contrast.
- **Status chips** (battle) — same semantic palette as tokens above: bleed/blind/poison/burn/freeze keep distinct saturated hues; buff/debuff/shield/redirect map onto good/bad/info/warn respectively (see Battle cluster mockup for the full set).
- **Move buttons** — damage moves keep type-color fill (data channel); buff/debuff/drain/redirect moves use semantic color + icon instead, so "what element" and "what kind of move" never compete for the same hue. Shipped as a two-line layout — name in display type, power/effect + MP cost in mono underneath, with a subtle top-highlight sheen — rather than one packed single-line label.
- **Navigation** — desktop: fixed 220px left rail, unchanged link set, active state = solid accent pill. Mobile (< 900px): bottom tab bar, 5 primary destinations (Dashboard/Inventory/Pokédex/Battle/More) + a "More" sheet holding Online, Friends, Notifications, History, Leaderboard, Profile — replaces the current slide-over hamburger, which doesn't fit a 10-item menu well at phone width.
- **Modal / Toast** — same overlay + centered panel model as today's `Modal.tsx`/`Toast.tsx`, restyled onto the new radius/shadow/color tokens. Toast card sizes to its content (no stretch) and anchors bottom-right. No new library.
- **Battle log** (bot + online) — background `--surface-3`, text `--ink`, so it's dark-screen/light-text in dark mode and flips to light-screen/dark-text in light mode, same as every other panel — it must **not** be hardcoded to a fixed dark terminal color, or it goes illegible (light-on-light) once the app is in dark theme. Each entry renders as its own line (`lib/battleEngine.ts`'s `classifyLogLine`), with victory lines in `--good`, defeat lines in `--bad`, and hit/effectiveness lines (`Normal Hit`, `SUPER EFFECTIVE!`, `Not very effective`, `NO EFFECT`) in `--accent-2` — fixed highlight colors in both themes, not theme-flipping surface colors, same convention as `.shiny-badge`.

## 7. Responsive rules

- Breakpoint: 900px switches rail ↔ tab bar (current app switches at 720px with a hamburger — raised because the tab bar needs more room to stay thumb-sized than a hidden drawer did).
- Two-pane list+detail screens (Pokédex, Inventory) — split pane ≥ 900px; below that, list/grid is the full screen and selecting an entry pushes a full-screen detail view with a back affordance, rather than compressing both panes.
- Battle arena's two `FighterCard`s sit side-by-side ≥ 720px, stack vertically (you on top) below that — never shrink to illegible 50%-width cards.
- Dashboard's 4-stat strip: 4-across ≥ 720px, 2×2 below.
- Generously padded touch targets on mobile; primary buttons full-width in narrow forms (auth, profile, online setup).

## 8. What's intentionally unchanged

- Emoji-as-iconography (kept, not replaced with an icon font) — deliberate for the playful Pokémon tone, standardized via the icon-chip treatment above rather than floating inline.
- Overall information architecture / page list (13 screens, same routes) — this is a visual and interaction-density redesign, not a re-scoping.
- The 18 type colors as categorical data — refined for contrast only.

---

**Status**: shipped in full (steps 30–39, `upgrades/main.md`, archived to `upgrades/archive/v5/`) as of 2026-08-19, with a follow-up fix pass on 2026-08-19 (post-wave audit: removed unused `.btn-ghost`/`.switch-labeled`/`.ai-arsenal` dead CSS, bumped button padding for mobile touch targets, fixed the mobile Pokédex/Inventory list overlapping the bottom tab bar, wired the battle log's per-line win/hit highlighting and bench MP meters — both closing deviations this doc had called out as gaps). One real, intentional deviation from the original spec remains and is called out inline above: base-stat meter coloring (§5). Everything else on this page matches what shipped.
