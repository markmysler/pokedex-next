# Upgrade Path (v2)

Second wave of upgrades, planned 2026-08-07 after the original 8-step plan
([archive/main.md](archive/main.md)) shipped in full: auth, the
collection/lootbox system, bot battle rework, app shell/navigation, 3v3
online battles, rematch, match history/leaderboard, and chat. This plan
covers what comes next: extending 3v3 to bot battles, a proper win/loss +
lootbox reveal experience, a shiny-Pokémon rarity tier, a friends system
with battle invites/chat/trading, security hardening, a fairer leaderboard,
per-Pokémon nicknames, a team picker that scales to hundreds of owned
Pokémon, real battle depth (dodge/bleed/blind), sound, richer Dashboard
stats, a trade-up burn mechanic, and batch lootbox opening — all built with
the app's existing hand-rolled CSS conventions (`.card`, `.btn-primary`,
etc.), no Tailwind/shadcn adoption.

Each step has its own file with what to build and an end state to validate
against before moving to the next step — same format as the archived plan.
Steps 1-5 shipped from the original version of this plan; steps 6-11 were
added 2026-08-08 at the user's request, before step 6 (friend chat +
trading) — that step was renumbered to 12 to make room and comes last.
Steps 13-15 were added later the same day, appended after step 12.

| # | Step | File | Depends on |
|---|------|------|------------|
| 1 | Bot battles go 3v3 | [01-bot-3v3.md](01-bot-3v3.md) | — |
| 2 | Battle result dialog (win/loss + lootbox reveal) | [02-battle-result-dialog.md](02-battle-result-dialog.md) | 1 |
| 3 | Shiny Pokémon | [03-shiny-pokemon.md](03-shiny-pokemon.md) | — (independent, but shown through steps 2 & 4's UI) |
| 4 | Lootbox opening experience (card-pack reveal) | [04-lootbox-opening.md](04-lootbox-opening.md) | 2, 3 |
| 5 | Friend system (requests, presence, invite-to-battle) | [05-friend-system.md](05-friend-system.md) | — |
| 6 | HSTS + security headers | [06-security-headers.md](06-security-headers.md) | — |
| 7 | Leaderboard counts online wins only | [07-leaderboard-online-wins.md](07-leaderboard-online-wins.md) | — |
| 8 | Per-instance Pokémon nicknames | [08-pokemon-nicknames.md](08-pokemon-nicknames.md) | — |
| 9 | Team picker parity with Inventory (search/filter/sort, shared components, shiny badge) | [09-team-picker-parity.md](09-team-picker-parity.md) | 8 |
| 10 | Battle depth (dodge, bleed, blind, poison, dual-role stats) | [10-battle-depth.md](10-battle-depth.md) | — |
| 11 | Sound effects (synthesized, no audio files) | [11-sound-effects.md](11-sound-effects.md) | 10 |
| 12 | Friend chat + trading | [12-friend-chat-trading.md](12-friend-chat-trading.md) | 5, 9 |
| 13 | Richer Dashboard statistics | [13-dashboard-stats.md](13-dashboard-stats.md) | — |
| 14 | Trade-up (burn 5 Pokémon for 1 lootbox) | [14-pokemon-tradeup.md](14-pokemon-tradeup.md) | 9, 13 |
| 15 | Open multiple lootboxes at once | [15-lootbox-batch-opening.md](15-lootbox-batch-opening.md) | — |

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

**Steps 6-11 are mostly independent of each other**, added in one batch
after steps 1-5 shipped:
- Security headers (6) and the leaderboard fix (7) touch nothing else in
  this plan — ordered first simply because they're small and quick to clear.
- Nicknames (8) before team-picker parity (9): step 9 extracts a shared
  Pokémon card component that needs to already know how to show a
  nickname, or it'd need touching twice.
- Battle depth (10) before sound effects (11): sound needs to know *what
  happened* in a round (a hit, a dodge, a status inflicted) to trigger the
  right sound — step 10 is what produces that structured event data, not
  just log strings.
- Step 12 (friend chat + trading, originally step 6) moved last: its trade
  builder reuses step 9's shared Pokémon-picker components, so it has to
  come after them; nothing else in steps 6-11 depends on friends existing
  either way.

**Steps 13-15**, added after step 12 in a later conversation:
- Dashboard stats (13) before trade-up (14): trade-up increments the same
  `pokemon_released_count` counter discard does, and that counter is
  introduced by step 13 — trade-up would have nothing to increment if it
  came first. Trade-up also depends on step 9's shared picker for its
  multi-select-5 UI, same reasoning as step 12.
- Batch lootbox opening (15) has no hard dependency on trade-up, but makes
  the most sense after it — trading up is what's most likely to leave
  someone holding several lootboxes at once, which is exactly the
  situation this step improves.

## Key decisions already made

From the 2026-08-07 planning conversation (steps 1-5):

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
  codebase yet. Built one shared `components/ui/Modal.tsx` (a simple
  fixed-overlay + centered `.card` panel, closes on backdrop click or an
  explicit close button — no focus-trap library, just the same
  `position: fixed` pattern `SideNav.tsx`'s mobile menu already uses) and
  one shared `components/ui/Toast.tsx`/`ToastProvider` (a small
  bottom-corner stack, auto-dismissing), reused everywhere else that needs
  one.
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
  one," and a trade is accept/decline only — no counter-offer negotiation
  in this pass. (Originally this also said starters mirrored discard's
  lack of protection and were tradeable — reversed later, see below.)

From the 2026-08-08 planning conversation (steps 6-11):

- **Passwords are already safe in transit — no fix needed, only
  defense-in-depth.** Login/signup call Supabase's Auth API directly from
  the browser over HTTPS; that traffic is already TLS-encrypted end to end
  and never touches this app's own server. Step 6 adds HSTS and a few
  standard security headers, not a "fix" for a vulnerability that doesn't
  exist — see [06-security-headers.md](06-security-headers.md) for the
  full reasoning.
- **Bot wins are deliberately excluded from the leaderboard**, not just
  weighted differently — a leaderboard should reflect standing against
  other players. Bot win/loss counts remain visible separately on the
  Dashboard, which already shows them split out.
- **Nicknames fall back to the species name, stored as `null` not `""`**
  when cleared — keeps `nickname ?? name` as the one fallback check
  everywhere instead of also handling blank strings.
- **Sound effects are synthesized with the Web Audio API, not audio
  files.** There's no way to source/license real audio assets in this
  environment, and synthesis keeps the app fully self-contained like
  everything else in it. Accepted tradeoff: simple/retro sound, not
  realistic sound design.
- **Battle depth is an additive layer on top of the existing damage
  formula**, not a rebalance — dodge/bleed/blind/poison are new rolls
  layered in around the unchanged atk/def/spatk/spdef damage math, giving
  `spd`/`def`/`spdef` a second role each rather than replacing what they
  already do.
- **Poison was added mid-implementation of step 10**, at the user's
  request, as a third damage-over-time status alongside bleed — same
  mechanics as bleed (duration, refresh-not-stack, tick formula) but gated
  by move *type* (`"Poison"`) instead of move *category*, so it stacks
  independently with bleed rather than replacing or conflicting with it.
- **No pagination/virtualization for the team picker's larger card grid**
  — hundreds of DOM nodes is already how `InventoryPageClient` handles
  scale today; windowing is a later, isolated addition if it's ever
  actually needed, not a prerequisite to ship search/filter/sort.

From the second 2026-08-08 planning conversation (steps 13-15):

- **"Pokémon released" is one counter shared by discard and trade-up**,
  not two separate stats — a `profiles.pokemon_released_count` column
  incremented by both, since `pokemon_instances` rows are hard-deleted and
  have no history to count retroactively. Named generically on purpose so
  it stays accurate regardless of which release mechanism was used.
- **"Most used Pokémon in battle" needs bot matches to start recording
  `team_snapshot` too** — today only online matches do. Step 13 closes
  that gap going forward; no backfill for matches recorded before it
  ships, same precedent as step 3's shiny rollout.
- **Trade-up is additive, not a replacement for discard.** Discard kept
  working exactly as it did before this step (at the time, that included
  starters — trade-up was the first mechanism to exclude them; discard and
  friend trading caught up to that same exclusion in a later change, see
  below). Flagged explicitly as a judgment call in case the intent was
  actually to retire discard once trade-up ships.
- **Trade-up gets a confirmation dialog before committing** — the one
  irreversible action in the app that didn't already have one, worth it
  specifically because 5 Pokémon are destroyed at once for an unknown
  reward.
- **Batch lootbox-opening reuses the single-open roll/persist logic**
  (factored into `lib/inventory.ts`) rather than duplicating it, and the
  reveal dialog resets between queued items via a React `key` change
  (remount), not manual internal state-reset logic.

Post-plan fixes and reversals, requested directly after all 15 steps
shipped (not numbered steps of their own — small enough to fold in here):

- **Starters can no longer be discarded or traded, reversing this plan's
  original "starters are tradeable" assumption.** Trade-up (step 14) was
  the first mechanism to exclude starters; discard and friend trading
  didn't, an inconsistency that became apparent once trade-up's exclusion
  was visible next to it. Now enforced identically everywhere a Pokémon
  can leave an account: `DELETE /api/inventory/pokemon/[id]`,
  `POST /api/friends/[id]/trade` (either side), and `accept_trade()`'s own
  re-validation at accept time — see the addendum in
  [12-friend-chat-trading.md](12-friend-chat-trading.md) for the live
  validation.
- A UI-polish pass fixed a near-invisible text contrast bug (a renamed
  Pokémon's species subline lost its own color and inherited the parent
  card's white-on-green when selected, instead of being explicitly
  overridden), added hover tooltips explaining the bleed/blind/poison
  status effects (step 10) in battle, removed a redundant +/- stepper next
  to the batch lootbox-opening quantity input (step 15) since the number
  input already has its own controls, and replaced the plain-text
  "offered X for Y" summary on a pending friend trade with the actual
  Pokémon cards (sprite, name, type, total stats) for both sides.

## Working through a step

1. Read the step's `.md` file in full before starting.
2. Implement it in isolation — don't pull in work from later steps even if
   it seems convenient.
3. Run through the **End state** checklist at the bottom of the step file.
   Every item should be verifiable by hand (`npm run build`, a browser
   check, a Supabase table query, etc.) — if an item can't be checked, the
   step isn't actually done.
4. Only move to the next step once its listed dependencies are checked off.
