# Kanto Pokédex — Web Edition

A full-stack Pokémon collection and battle game covering the original 151
Kanto species plus 6 Dark-type additions for Psychic counterplay: browse
the Pokédex, roll and collect your own Pokémon from lootboxes, evolve them,
and battle them against AI or other players in real time — in English or
Argentinian Spanish.

> Unofficial, non-commercial fan project. Not affiliated with or endorsed
> by Nintendo, Game Freak or The Pokémon Company. See
> [Disclaimer](#disclaimer).

## Features

- **Pokédex** — the 151 Kanto species plus 6 Dark-type additions (Umbreon;
  Houndour → Houndoom; Larvitar → Pupitar → Tyranitar — Psychic's only
  hard counter, added since Dark didn't otherwise exist in Kanto), 157
  species total, with base stats, types, and moves.
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
  (burn 5 unwanted Pokémon for 1 guaranteed lootbox), Evolution (burn 5
  same-species Pokémon for 1 guaranteed instance of its evolution, stats
  derived from the 5 burned instances rather than freshly rolled), and
  friend-to-friend trading.
- **Social** — friends list with invites, direct trading, a chat/message
  thread per friend, and a global leaderboard.
- **Progress tracking** — Dashboard stat strip, match history, and
  in-app notifications.
- **Starters** — every new account picks one of Bulbasaur, Charmander, or
  Squirtle as a permanent starter (can't be traded or discarded) with a
  hand-authored moveset.
- **Bilingual** — English and Argentinian Spanish, toggled from the same
  account block as the Sound toggle; the whole app is translated (species/
  move names and a handful of established jargon terms stay untranslated
  in both).

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

## Developing against a local Supabase instance

Real players use this app — no feature work happens directly against
production. The workflow:

1. Work on a dedicated branch, never `main` directly, and don't push it
   until the whole wave is validated (see [upgrades/](upgrades/)'s own
   per-wave process). This keeps the branch — and anything Vercel or
   Supabase would otherwise auto-deploy from it — entirely local until
   you're ready.
2. Start a local Supabase stack (requires [Docker
   Desktop](https://www.docker.com/products/docker-desktop/) running):

   ```bash
   npm run db:start   # supabase start -- pulls images on first run, then
                       # applies every migration in supabase/migrations/
                       # against a fresh local Postgres instance
   ```

   Other lifecycle commands: `npm run db:stop`, `npm run db:status`,
   `npm run db:reset` (wipes and replays every migration from scratch —
   the fast way to check a new migration applies cleanly).
3. Point `.env.local` at the values `supabase status` prints (`API URL` →
   `NEXT_PUBLIC_SUPABASE_URL`, `anon key` → `NEXT_PUBLIC_SUPABASE_
   PUBLISHABLE_KEY`, `service_role key` → `SUPABASE_SECRET_KEY`) instead of
   your real project's. `.env.local` is gitignored, so this never touches
   what's deployed — back up your production values first if
   `.env.local` currently holds them (e.g. `cp .env.local
   .env.local.production.bak`, also gitignored) so switching back later is
   a copy, not a trip to the Supabase dashboard.
4. `npm run dev` as normal — now talking entirely to the local instance.
   Sign up a fresh test account (the `handle_new_user` trigger seeds
   starters the same way it does in production) rather than needing any
   special seed data.
5. Once every step in the wave is implemented and validated locally, merge
   to `main` locally and push — that single push is what triggers the real
   Supabase GitHub integration (migrations) and Vercel deploy (production
   code), only once, with everything already proven out.

## Project structure

```
app/
  [lang]/              every page, under an EN/ES-AR URL segment (/en/...,
                        /es-AR/...) -- see next/root-params in
                        node_modules/next/dist/docs/
    (app)/              authenticated screens (battle, inventory, pokedex,
                         dashboard, friends, online, leaderboard, etc.)
    login/, signup/     auth screens
  api/                 server routes (battles, rooms, friends, inventory,
                       ...) -- not under [lang]; Route Handlers don't render
                       user-facing text, so they don't need a locale
components/           React components, grouped by feature area
lib/                  business logic — battle engine, collection/roll
                       logic, evolution, Supabase clients, dashboard/
                       leaderboard/history queries
  i18n/                dictionaries (en.ts/es-AR.ts), getDictionary()
                       (Server Components) / useDictionary() (Client)
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

## Disclaimer

Kanto Pokédex — Web Edition is an unofficial, non-commercial fan project
made for learning and for fun. It is not affiliated with, endorsed,
sponsored or approved by Nintendo, Game Freak, Creatures Inc. or The
Pokémon Company.

Pokémon, the Pokémon names, characters, sprites and related marks are
trademarks and copyrights of Nintendo, Game Freak, Creatures Inc. and The
Pokémon Company. They are used here for non-commercial fan purposes only.
Nothing in this project is sold, and no money changes hands: lootboxes are
earned in game and cannot be bought.

If you are a rights holder and want something changed or removed, please
open an issue or contact the author and it will be dealt with promptly.
