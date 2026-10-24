# Pokédex — Design System ("Stadium", wave v9)

The implementation reference for the v9 redesign (`upgrades/main.md`). The approved direction, with mockups and a playable reel demo, is the "Pokédex Stadium Redesign" artifact linked from the PR. This file describes what shipped and where it lives.

**Direction.** Night-stadium neutrals with a slight blue bias, Poké Red as the only brand colour, and a second, systematic colour language for rarity that every Pokémon card carries. The two things players come back for, opening cases and battling, are the loudest moments. Everything else is quieter and denser, so it reads at a glance.

## 1. Files

| What | Where |
|---|---|
| Tokens, base, shared components, app shell, auth | `app/globals.css` |
| Case opening (reel, result card) | `app/styles/case.css` |
| My Pokémon, Pokédex, filter bar, action bar | `app/styles/collection.css` |
| Battle field, dock, feed, team tray, online rooms, chat | `app/styles/battle.css` |
| Home, tables, notifications, friends, trades, profile | `app/styles/social.css` |
| Icons | `components/ui/Icon.tsx` |
| Rarity grades | `lib/rarity.ts` (tests in `tests/rarity.test.ts`) |
| Stat order and colours | `lib/statDisplay.ts` |

All stylesheets are imported from `app/[lang]/layout.tsx`, `globals.css` first.

## 2. Colour tokens

Dark is the default (`:root` and `[data-theme="dark"]`); light is `[data-theme="light"]`. The avatar menu's Dark mode switch sets `data-theme`, as the old sidebar toggle did.

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | `#0C0E13` | `#F2F3F7` | page |
| `--surface` / `-2` / `-3` | `#141821` / `#1B202C` / `#252C3B` | `#FFFFFF` / `#EEF0F5` / `#DFE3EC` | panels / raised / tracks |
| `--line` / `--line-strong` | `#2A3242` / `#3A4357` | `#D8DCE6` / `#C3C9D6` | hairlines / hover borders |
| `--ink` / `-soft` / `-faint` | `#ECEFF6` / `#A2AABD` / `#6B7389` | `#12151C` / `#4C5568` / `#7C8498` | text |
| `--accent` | `#FF3B47` | `#D7262F` | primary buttons, active nav, focus |
| `--good` `--warn` `--bad` `--info` | `#3DDC97` `#F5B941` `#FF7A59` `#6FA6FF` | darker equivalents | status only, never actions |

**Rarity** (`--r-*`, set on an element via `.rarity-common` … `.rarity-shiny`, read as `--rc`): Common `#9AA7BA`, Uncommon `#4B8BFF`, Rare `#8C5CFF`, Epic `#E042C4`, Legendary `#FF4D4D`, Shiny `#F7C548`. Type colours (`lib/typeData.ts`) appear only inside type chips.

## 3. Rarity grades

Display-only. The game still rolls species uniformly; a grade is a label from the species' base-stat total (`lib/rarity.ts`): Common under 330, Uncommon 330–449, Rare 450–499, Epic 500–579, Legendary 580 and up (the 7 strongest species). A shiny instance overrides its grade with Shiny. Grades drive card bands and glows, reel colours, the "Rarity" sort and the case contents odds. Nothing stored or rolled depends on them.

## 4. Type

Three faces via `next/font/google`, self-hosted at build time (no request reaches Google at runtime):

- **Chakra Petch** (`--font-display`, 500–700): headings, buttons, card names.
- **Figtree** (`--font-body`): everything people read.
- **JetBrains Mono** (`--font-mono`): readouts: numbers, room and friend codes, eyebrows.

Eyebrows are 11px mono uppercase with 0.12em tracking. Headings get `text-wrap: balance`.

## 5. Shape and spacing

Radius: `--r-sm 6`, `--r-md 10` (buttons, inputs), `--r-lg 14` (panels), `--r-xl 20` (dialogs, the case stage, the battle field). Layout uses grid/flex `gap`, not margins. Pages are `.page` (max 1280px; `.page-narrow` 760px) with a `.page-head` (eyebrow + h1 + actions) and, for sections with siblings, `SectionTabs`.

## 6. Shell and navigation

- **Top bar**: brand, Pokédex search (`/` focuses it; jumps to `/pokedex#025`), the case counter (always visible, links to Open cases), the notifications bell with unread count, and the avatar menu (profile, history, leaderboard, dark mode, sound, language, log out).
- **Rail** (≥900px): four groups (Play: Home, Battle, Online · Collection: Open cases, My Pokémon, Pokédex · Social: Friends · Records: History, Leaderboard). Active item: raised surface plus a red inset bar.
- **Tab bar** (<900px): Home, Collection, a raised Open button with the case count, Battle, Social. Sibling pages are reached through each page's `SectionTabs`.
- The case count lives in `CaseCountProvider` (`components/nav/CaseCount.tsx`) so pages that change it (opening, trade up, battle rewards) update the top bar immediately.

## 7. Components

- **Buttons**: `.btn-primary` (solid red), `.btn-secondary` (raised), `.btn-ghost` (text), `.btn-danger` (outline), sizes `.btn-sm` / `.btn-lg` / `.btn-block`; `.icon-btn` for icon-only buttons (always with an `aria-label`).
- **Pokémon card** (`PokemonInstanceCard`, `.pcard`): a `<button>` with sprite, name, types and total; the rarity band (4px) and glow along the bottom; a filled gold star for shiny and a heart for starters; checkbox in selection contexts, pick-order badge in the team tray. `.prow` is the list-view row.
- **Meters**: `SegmentedMeter` for stats (12 cells by default, per-stat colours from `lib/statDisplay.ts`); `.hpbar` (smooth, good/mid/low colours) for battle HP.
- **Dialog**: `Modal` is a native `<dialog>` opened with `showModal()`, so focus trapping, Escape and the top layer come from the browser. Sizes md/lg/xl.
- **Toast**: bottom-right stack, a polite live region.
- **Chips**: `.type-chip` (type colour), `.tag` and semantic variants, `.grade-label`, `.status-chip` (battle effects).
- **Icons**: `Icon` renders the in-house set (24px grid, 1.8 stroke, `currentColor`). Emoji stay only inside battle-log text.

## 8. Key flows

- **Case opening** (`components/cases/`): Open calls the existing endpoint first; the case shakes for at least 450ms while it runs. Then `planReel()` builds a 60-card strip seeded from the returned Pokémon's id, with the winner at index 52 and filler drawn at the real odds (no planted near-misses). `CaseReel` animates it with a long ease-out (6.5s, 2.4s with Fast spin, 0.8s with reduced motion), ticks through `playReelTickSound`, and lands with a random offset inside the winning card. Shinies scroll past as hidden gold ★ cards. Batches spin up to five reels that stop one by one; Skip finishes them all; "Open all instantly" skips the reel. `RevealCard` shows the result's stats and moves in sequence. Battle rewards and evolution reuse the same pieces through `LootboxRevealDialog`.
- **My Pokémon**: grid plus a sticky detail panel (a dialog under 1100px). Select mode shows checkboxes and a bottom action bar with Trade up and Evolve, each explaining what it still needs. The detail panel tracks evolution progress; "Evolve now" preselects the 5 strongest copies (evolved stats derive from the burned five) and opens the confirm dialog.
- **Battle**: `TeamPicker` keeps the three slots in a sticky tray with Best 3 and Lock in. `BattleStage` (bot and online) draws the field (opponent back-right, you front-left, HUDs with HP, bench dots and status chips), a caption of the round and floating damage numbers from the round's events, an action dock (Fight/Switch tabs, 2×2 move buttons with uses as pips, an ally picker for buffs) and the battle feed (rounds newest-first).
- **Social**: friends list with your copyable code beside it; chat and trades side by side, offers as give ⇄ get cards, proposals in a two-column builder dialog.

## 9. Responsive and motion

Breakpoints: 900px (rail ↔ tab bar), 1100px (side panels ↔ dialogs, feed below the field), 700px (phone layouts: stacked tray, smaller field and reel). `prefers-reduced-motion` shortens every animation, and the reel uses its 0.8s spin.

## 10. What stayed the same

Routes and API calls (plus one new route, `/[lang]/open`), the sprite artwork, the per-stat colours, the type colours, the battle-log copy, the sound engine (`lib/sound.ts`, which gained three reel sounds), and the no-UI-library rule.
