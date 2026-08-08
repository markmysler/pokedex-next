# Upgrade Path (v2)

Second wave of upgrades, planned 2026-08-07 after the original 8-step plan
([archive/main.md](archive/main.md)) shipped in full: auth, the
collection/lootbox system, bot battle rework, app shell/navigation, 3v3
online battles, rematch, match history/leaderboard, and chat. This plan
covers what comes next: extending 3v3 to bot battles, a proper win/loss +
lootbox reveal experience, a shiny-Pokémon rarity tier, and a friends system
with battle invites, chat, and trading — all built with the app's existing
hand-rolled CSS conventions (`.card`, `.btn-primary`, etc.), no
Tailwind/shadcn adoption.

Each step has its own file with what to build and an end state to validate
against before moving to the next step — same format as the archived plan.

| # | Step | File | Depends on |
|---|------|------|------------|
| 1 | Bot battles go 3v3 | [01-bot-3v3.md](01-bot-3v3.md) | — |
| 2 | Battle result dialog (win/loss + lootbox reveal) | [02-battle-result-dialog.md](02-battle-result-dialog.md) | 1 |
| 3 | Shiny Pokémon | [03-shiny-pokemon.md](03-shiny-pokemon.md) | — (independent, but shown through steps 2 & 4's UI) |
| 4 | Lootbox opening experience (card-pack reveal) | [04-lootbox-opening.md](04-lootbox-opening.md) | 2, 3 |
| 5 | Friend system (requests, presence, invite-to-battle) | [05-friend-system.md](05-friend-system.md) | — |
| 6 | Friend chat + trading | [06-friend-chat-trading.md](06-friend-chat-trading.md) | 5 |

## Why this order

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
needs to be built first. It's ordered before step 4 because the lootbox
card-pack reveal needs something to dramatically reveal, and before step 2
implicitly because the result dialog's lootbox-earned message benefits from
being able to say "and it's shiny!" for a big win (not a hard blocker,
just why it's listed before both).

**Friends before friend chat/trading.** Trading and DMs only make sense
between two accounts that are already friends — the friend-request/accept
flow has to exist first.

## Key decisions already made

From the 2026-08-07 planning conversation:

- **No Tailwind/shadcn migration.** A first pass at a shadcn/ui re-skin was
  built and validated (step 1 of an earlier draft of this plan) but rolled
  back after review — the visual result wasn't what was wanted. Every new
  UI in this plan (result dialog, lootbox reveal, friend list, trade
  screen, toasts) is built with the app's existing plain-CSS conventions
  instead: reuse `.card`/`.btn-primary`/`.btn-secondary` and
  `app/globals.css`'s existing CSS custom properties (`--bg-*`, `--text-*`,
  `--border-color`), add new scoped classes the same way existing
  components do (e.g. `.pokemon-grid-card`, `.stat-bar-fill`), and animate
  with plain CSS `@keyframes`/transitions rather than a library.
- **Modals and toasts are small custom components, not a UI-kit import.**
  Steps 2, 4, and 5 each need an overlay (a result/reveal dialog) or a
  transient notification (friend request toasts) that don't exist in this
  codebase yet. Build one shared `components/ui/Modal.tsx` (a simple
  fixed-overlay + centered `.card` panel, closes on backdrop click or an
  explicit close button — no focus-trap library, just the same
  `position: fixed` pattern `SideNav.tsx`'s mobile menu already uses) and
  one shared `components/ui/Toast.tsx`/`ToastProvider` (a small
  bottom-corner stack, auto-dismissing) the first time either is needed,
  then reuse both everywhere else that needs one.
- **Shiny is computed, not stored.** No `is_shiny` column, no backfill
  migration — see [03-shiny-pokemon.md](03-shiny-pokemon.md) for the exact
  formula. A side effect worth calling out: every Pokémon anyone already
  owns gets evaluated retroactively the moment this ships, so some existing
  inventories will suddenly show shinies that "always were," they just
  weren't labeled yet.
- **Shiny considers both stats and moveset**, not stats alone — a combined
  percentile across both, each contributing equally.
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
