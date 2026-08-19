# Visual Redesign Tracker

Tracks progress of the modern/Pokémon-inspired redesign (see `DESIGN_SYSTEM.md` for tokens). **Shipped in full** — all 15 screens and all 10 shared components below are implemented, responsive, and verified in both themes (steps 30–39, `upgrades/main.md`, archived to `upgrades/archive/v5/`).

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
| 1 | Login | `/login` | ✅ Done | auth card, minimal mobile delta |
| 2 | Signup | `/signup` | ✅ Done | incl. "check your email" state |
| 3 | Dashboard | `/dashboard` | ✅ Done | new 4-tile stat strip replaces prose stat cards |
| 4 | Profile | `/profile` | ✅ Done | avatar + form + friend code plate |
| 5 | Pokédex (list+detail) | `/pokedex` | ✅ Done | mobile: grid → full-screen detail sheet |
| 6 | Inventory (list+detail) | `/inventory` | ✅ Done | lootbox banner promoted to gold hero card |
| 7 | Lootbox reveal | modal | ✅ Done | drumroll → sprite → stats → moves, unchanged pacing |
| 8 | Team Picker | pre-battle | ✅ Done | shared by Battle + Online |
| 9 | Battle Arena (bot) | `/battle` | ✅ Done | fighters stack on mobile instead of shrinking |
| 10 | Online Battle (setup/waiting/picking/battling/rematch) | `/online` | ✅ Done | room-code plate + chat panel carried through all phases |
| 11 | Friends | `/friends` | ✅ Done | code plate, incoming/outgoing, friend list |
| 12 | Friend Chat & Trade | `/friends/[id]` | ✅ Done | trade card + chat panel |
| 13 | Notifications | `/notifications` | ✅ Done | shares list-row shape with History/Leaderboard |
| 14 | History | `/history` | ✅ Done | win/loss stripe, team snapshot line |
| 15 | Leaderboard | `/leaderboard` | ✅ Done | medal ranks, "me" row highlight |

## Shared components

| Component | Status | Notes |
|---|---|---|
| App shell (rail nav / bottom tabs) | ✅ Done | breakpoint moves from 720px hamburger → 900px rail/tab-bar split |
| `Sprite` | ✅ Done | frame/background treatment only, same `<img>` behavior |
| `TypeBadges` | ✅ Done | refined contrast, same 18-color mapping |
| `PokemonInstanceCard` (grid + list) | ✅ Done | |
| `PokemonFilterBar` | ✅ Done | |
| `FighterCard` + `StatusBadges` | ✅ Done | segmented meters, semantic status colors |
| `MoveButton` | ✅ Done | type color for damage, semantic color for buff/debuff/drain/redirect |
| `Modal` / `Toast` | ✅ Done | same structural model, new tokens |
| Segmented stat/HP/MP meter (new) | ✅ Done | replaces smooth `.progress-fill` gradient bars |
| "Bezel tab" card header (new) | ✅ Done | replaces inline-emoji `<h3>` card headers app-wide |

## Status

Wave complete as of 2026-08-19. See `upgrades/archive/v5/main.md` for the full step-by-step implementation history, validation notes, and the key decisions made along the way (design direction, token choices, and several judgment calls documented as they came up). `upgrades/main.md` now points here as "no active wave."
