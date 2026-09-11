# Kanto Pokédex — Web Edition

A full-stack Pokémon collection and battle game covering the original 151
Kanto species: browse the Pokédex, roll and collect your own Pokémon from
lootboxes, and battle them against AI or other players in real time.

## Features

- **Pokédex** — all 151 Kanto species with base stats, types, and moves.
- **Collection** — lootboxes roll a Pokémon with its own randomized stats
  and moveset, centered on (but independently varying from) its species'
  base stats, so no two of the same species are ever quite identical.
  Rare **shiny** rolls land near the top of what a species can roll.
- **Battles** — 3-on-3 team battles with switching, status effects (burn,
  poison, blind, freeze, bleed), and buff/debuff/drain/redirect moves
  layered on top of standard type-effectiveness damage:
  - **Against AI** — instant, solo, no opponent needed. Wins have a 60%
    chance to drop a lootbox.
  - **Online PvP** — create or join a room by code, battle another
    player's team live, with in-room chat and rematch support. Wins
    always drop a lootbox.
  - **Move uses** — every move can be cast a limited number of times per
    battle (`max_uses`), no regenerating resource pool. Each Pokémon
    always has at least one move — its weakest damage move, computed per
    battle — that's freely castable with no limit.
  - Every rolled or backfilled moveset guarantees 3 damage moves + 1
    support move.
- **Collection management** — Inventory with per-Pokémon detail, Trade Up
  (burn 5 unwanted Pokémon for 1 guaranteed lootbox), and friend-to-friend
  trading.
- **Social** — friends list with invites, direct trading, a chat/message
  thread per friend, and a global leaderboard.
- **Progress tracking** — Dashboard stat strip, match history, and
  in-app notifications.
- **Starters** — every new account picks one of Bulbasaur, Charmander, or
  Squirtle as a permanent starter (can't be traded or discarded) with a
  hand-authored moveset.

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router) + React 19 + TypeScript
- [Supabase](https://supabase.com) — Postgres database, Auth (email/password)
- No UI component library — hand-rolled design system (see
  [design/DESIGN_SYSTEM.md](design/DESIGN_SYSTEM.md))

## Getting started

### Prerequisites

- Node.js and npm
- A [Supabase](https://supabase.com) project

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template and fill it in with values from your
   Supabase project's dashboard (**Project Settings → API**):

   ```bash
   cp .env.local.example .env.local
   ```

3. Apply the database schema. This project's migrations
   (`supabase/migrations/*.sql`) are written to run through Supabase's
   GitHub integration — connect your Supabase project to this repo and
   push to `main`, or apply them manually via the Supabase SQL editor in
   the order they're numbered.

4. Run the development server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

### Other scripts

```bash
npm run build   # production build
npm run start   # run a production build
npm run lint    # eslint
```

## Project structure

```
app/                  Next.js App Router pages and API routes
  (app)/               authenticated screens (battle, inventory, pokedex,
                        dashboard, friends, online, leaderboard, etc.)
  api/                 server routes (battles, rooms, friends, inventory, ...)
  login/, signup/      auth screens
components/           React components, grouped by feature area
lib/                  business logic — battle engine, collection/roll
                       logic, Supabase clients, dashboard/leaderboard/
                       history queries
types/                shared TypeScript types (Pokémon, moves, battle state)
supabase/migrations/  versioned SQL schema, applied in order
design/               design system spec and per-screen redesign tracker
upgrades/             this project's own step-by-step development log —
                       every feature wave is planned and tracked here
                       before it ships
```

## Development process

This project tracks its own feature work in [upgrades/](upgrades/):
completed waves are archived under `upgrades/archive/`, and
[upgrades/main.md](upgrades/main.md) always reflects whatever's
currently in progress (or says "no active wave" between them).
