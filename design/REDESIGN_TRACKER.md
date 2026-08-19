# Visual Redesign Tracker

Tracks progress of the modern/Pokémon-inspired redesign (see `DESIGN_SYSTEM.md` for tokens). Status refers to **implementation in code** — every screen below already has a finished, responsive (desktop + mobile) design mockup; none have been coded yet.

**Legend**: 🎨 Designed → not built · 🚧 In progress → build started · ✅ Done → matches mockup, responsive, both themes verified

## Design artifacts

| Artifact | Covers | Link |
|---|---|---|
| Design System | Tokens, buttons, inputs, badges, meters, nav, modal/toast | https://claude.ai/code/artifact/2e08a5db-d4df-4ea4-bff5-f1bd8d2a48dc |
| Account cluster | Login, Signup, Dashboard, Profile | https://claude.ai/code/artifact/8694c169-f6e6-45d1-838e-4857cdb31883 |
| Collection cluster | Pokédex, Inventory, Lootbox reveal | https://claude.ai/code/artifact/bb70364c-fa43-49cd-8ea0-ba2c21ceab17 |
| Battle cluster | Team Picker, Battle Arena (bot + online), room/chat | https://claude.ai/code/artifact/bcb089b5-2770-4f09-a8c2-0f93df2eb551 |
| Social cluster | Friends, Friend Chat/Trade, Notifications, History, Leaderboard | https://claude.ai/code/artifact/0e2c0ba7-6899-418e-80ec-aea18013ab04 |

> Artifacts are private to this account by default — share from each artifact's page if others need access. If a link ever goes stale, ask to republish the corresponding `design/*.html` source (currently in the session scratchpad, not this repo).

## Screens

| # | Screen | Route | Status | Notes |
|---|---|---|---|---|
| 1 | Login | `/login` | 🎨 Designed | auth card, minimal mobile delta |
| 2 | Signup | `/signup` | 🎨 Designed | incl. "check your email" state |
| 3 | Dashboard | `/dashboard` | 🎨 Designed | new 4-tile stat strip replaces prose stat cards |
| 4 | Profile | `/profile` | 🎨 Designed | avatar + form + friend code plate |
| 5 | Pokédex (list+detail) | `/pokedex` | 🎨 Designed | mobile: grid → full-screen detail sheet |
| 6 | Inventory (list+detail) | `/inventory` | 🎨 Designed | lootbox banner promoted to gold hero card |
| 7 | Lootbox reveal | modal | 🎨 Designed | drumroll → sprite → stats → moves, unchanged pacing |
| 8 | Team Picker | pre-battle | 🎨 Designed | shared by Battle + Online |
| 9 | Battle Arena (bot) | `/battle` | 🎨 Designed | fighters stack on mobile instead of shrinking |
| 10 | Online Battle (setup/waiting/picking/battling/rematch) | `/online` | 🎨 Designed | room-code plate + chat panel carried through all phases |
| 11 | Friends | `/friends` | 🎨 Designed | code plate, incoming/outgoing, friend list |
| 12 | Friend Chat & Trade | `/friends/[id]` | 🎨 Designed | trade card + chat panel |
| 13 | Notifications | `/notifications` | 🎨 Designed | shares list-row shape with History/Leaderboard |
| 14 | History | `/history` | 🎨 Designed | win/loss stripe, team snapshot line |
| 15 | Leaderboard | `/leaderboard` | 🎨 Designed | medal ranks, "me" row highlight |

## Shared components

| Component | Status | Notes |
|---|---|---|
| App shell (rail nav / bottom tabs) | 🎨 Designed | breakpoint moves from 720px hamburger → 900px rail/tab-bar split |
| `Sprite` | 🎨 Designed | frame/background treatment only, same `<img>` behavior |
| `TypeBadges` | 🎨 Designed | refined contrast, same 18-color mapping |
| `PokemonInstanceCard` (grid + list) | 🎨 Designed | |
| `PokemonFilterBar` | 🎨 Designed | |
| `FighterCard` + `StatusBadges` | 🎨 Designed | segmented meters, semantic status colors |
| `MoveButton` | 🎨 Designed | type color for damage, semantic color for buff/debuff/drain/redirect |
| `Modal` / `Toast` | 🎨 Designed | same structural model, new tokens |
| Segmented stat/HP/MP meter (new) | 🎨 Designed | replaces smooth `.progress-fill` gradient bars |
| "Bezel tab" card header (new) | 🎨 Designed | replaces inline-emoji `<h3>` card headers app-wide |

## Next steps

1. Review all five artifacts, confirm direction before any code changes.
2. Once approved, implement in `app/globals.css` + component-by-component, checking each row above to ✅ as it ships (verify both themes + mobile/desktop each time).
3. Suggested build order: Design System tokens first (globals.css), then Account cluster (smallest surface area), Collection, Battle (largest), Social last.
