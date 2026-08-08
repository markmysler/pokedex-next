# Upgrade Path (v2)

Second wave of upgrades, planned 2026-08-07 after the original 8-step plan
([archive/main.md](archive/main.md)) shipped in full: auth, the
collection/lootbox system, bot battle rework, app shell/navigation, 3v3
online battles, rematch, match history/leaderboard, and chat. This plan
covers what comes next: a visual overhaul onto shadcn/ui, extending 3v3 to
bot battles, a proper win/loss + lootbox reveal experience, a shiny-Pokémon
rarity tier, and a friends system with battle invites, chat, and trading.

Each step has its own file with what to build and an end state to validate
against before moving to the next step — same format as the archived plan.

| # | Step | File | Depends on |
|---|------|------|------------|
| 1 | Design system: Tailwind + shadcn/ui foundation | [01-design-system.md](01-design-system.md) | — |
| 2 | Bot battles go 3v3 | [02-bot-3v3.md](02-bot-3v3.md) | 1 |
| 3 | Battle result dialog (win/loss + lootbox reveal) | [03-battle-result-dialog.md](03-battle-result-dialog.md) | 1, 2 |
| 4 | Shiny Pokémon | [04-shiny-pokemon.md](04-shiny-pokemon.md) | — (independent, but shown through steps 3 & 5's UI) |
| 5 | Lootbox opening experience (card-pack reveal) | [05-lootbox-opening.md](05-lootbox-opening.md) | 1, 3, 4 |
| 6 | Friend system (requests, presence, invite-to-battle) | [06-friend-system.md](06-friend-system.md) | 1 |
| 7 | Friend chat + trading | [07-friend-chat-trading.md](07-friend-chat-trading.md) | 6 |

## Why this order

**Design system first.** This repo has zero Tailwind/shadcn setup today —
adopting it touches every existing page. Every other step in this plan
builds brand-new UI (a result dialog, a card-pack reveal animation, a
friends list, a trade screen). Doing the migration first means that new UI
gets built once, directly in shadcn — the alternative (build it all in
today's plain CSS, then redo it later) is strictly more work for the same
end state.

**Bot battles go 3v3 before the result dialog.** Right now bot battles are
1v1 (`components/battle/BattleArena.tsx`, deliberately scoped that way in
the original plan's step 5) while online battles are 3v3 with a real team
battle engine (`resolveTeamRound`/`buildTeamState` in `lib/battleEngine.ts`).
Unifying bot battles onto the same 3v3 engine *before* building the result
dialog means the dialog only ever has to handle one battle shape ("your team
won/lost") instead of two.

**Shiny is independent but feeds two other steps.** It's a pure read-time
computation over data that already exists (`pokemon_instances` rows +
static species/move data) — no migration, no new RNG roll, nothing else
needs to be built first. It's ordered before step 5 because the lootbox
card-pack reveal needs something to dramatically reveal, and before step 3
implicitly because the result dialog's lootbox-earned message benefits from
being able to say "and it's shiny!" for a big win (not a hard blocker,
just why it's listed before both).

**Friends before friend chat/trading.** Trading and DMs only make sense
between two accounts that are already friends — the friend-request/accept
flow has to exist first.

## Key decisions already made

From the 2026-08-07 planning conversation:

- **Shiny is computed, not stored.** No `is_shiny` column, no backfill
  migration — see [04-shiny-pokemon.md](04-shiny-pokemon.md) for the exact
  formula. A side effect worth calling out: every Pokémon anyone already
  owns gets evaluated retroactively the moment this ships, so some existing
  inventories will suddenly show shinies that "always were," they just
  weren't labeled yet.
- **Shiny considers both stats and moveset**, not stats alone — a combined
  percentile across both, each contributing equally.
- **shadcn/ui migration is foundation-first**, done once up front rather
  than bolted on at the end or built alongside old-style CSS.
- **Friend requests and battle invites use an app-wide live notification**
  (a Realtime subscription kept open at the app-shell level, the same
  broadcast mechanism the battle rooms already use, just scoped per-account
  instead of per-room) — not something you only see by visiting a Friends
  page.
- **Bot 3v3 reuses the existing team battle engine as-is.** No changes to
  `resolveTeamRound`/`buildTeamState`/`lib/collection.ts`'s stat rolling —
  this step is UI plus a "roll 3 bots instead of 1" change, not new battle
  math.
- **A friend invite still creates a real room code under the hood** — the
  friend-list "Battle" button is a UI shortcut over the existing
  `POST /api/rooms` → share code → join flow (step 5 of the archived plan),
  not a parallel invite/matchmaking system.
- **Trading is asynchronous and persisted** (unlike battle chat, which is
  deliberately ephemeral). A trade offer is a real row a friend can review
  and accept whenever they're next online, not something requiring both
  players present at once. Default assumption, flagged for revisiting once
  built: no cap on how many Pokémon either side can offer beyond "at least
  one," starters are tradeable (mirrors today's discard behavior, which
  already lets starters be discarded with no special protection), and a
  trade is accept/decline only — no counter-offer negotiation in this pass.

## Working through a step

1. Read the step's `.md` file in full before starting.
2. Implement it in isolation — don't pull in work from later steps even if
   it seems convenient.
3. Run through the **End state** checklist at the bottom of the step file.
   Every item should be verifiable by hand (`npm run build`, a browser
   check, a Supabase table query, etc.) — if an item can't be checked, the
   step isn't actually done.
4. Only move to the next step once its listed dependencies are checked off.
