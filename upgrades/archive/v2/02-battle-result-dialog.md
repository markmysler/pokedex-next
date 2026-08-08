# Step 2: Battle result dialog (win/loss + lootbox reveal)

## Why here

Right now a battle ending is just a line in the log and a status message —
easy to miss, and the game never actually tells you whether you earned a
lootbox. This step adds a real modal moment. It's ordered after step 1 so
bot battles are already the same 3v3 shape as online, meaning this is one
dialog, not two.

## What changes

### Shared component
- New `components/ui/Modal.tsx` (if it doesn't exist yet by the time this
  step is built — see [main.md](main.md)'s "Key decisions already made"): a
  small fixed-overlay + centered `.card` panel, closes on backdrop click or
  an explicit close button, no other step depends on building this first.
- New `components/battle/BattleResultDialog.tsx`, built on `Modal`, used by
  both `BattleArena.tsx` (bot) and `OnlineBattle.tsx` (online):
  - **Win**: congratulatory message + either "🎁 You earned a lootbox!" or
    "No lootbox this time" — truthfully, not just "you won so you probably
    got one," since bot wins are only a 25% roll.
  - **Loss**: a distinct "Better luck next time" message. Never mentions a
    lootbox — losers never get one, in either mode.
  - A primary action (styled with the existing `.btn-primary`) to dismiss,
    revealing the existing post-battle UI underneath (the rematch prompt
    for online, the reset/auto-battle controls for bot battles — this step
    doesn't touch either of those).
  - Once step 4 exists, a lootbox-earned dialog gets a second action —
    "Open it now" — that jumps straight into the card-pack reveal flow
    instead of leaving the player to find it in Inventory later. Not
    buildable yet in this step (step 4 doesn't exist), so land it as a
    small follow-up edit to this dialog when step 4 is actually built,
    rather than guessing at that API now.

### Knowing whether a lootbox was actually granted
Both existing endpoints already know this at the moment the battle ends —
neither currently tells the client:
- `app/api/battles/bot-result/route.ts` already computes and *returns*
  `lootboxGranted` in its response; `BattleArena.tsx`'s `reportBotResult()`
  currently just fires-and-forgets it. Wire the returned value into the
  dialog instead of discarding it.
- `app/api/rooms/[code]/move/route.ts`'s `recordBattleEnd()` inserts a
  lootbox unconditionally for the online winner (100% — see the original
  plan's step 3) but the round-result payload it broadcasts/returns doesn't
  say so. Add `lootboxGranted: boolean` to that payload (`true` for the
  winner, `false` for the loser) so both clients can render the dialog
  correctly without a second request.

### Avoiding a duplicate dialog (online only)
`OnlineBattle.tsx` already dedupes "battle over" across three arrival paths
— Realtime broadcast, the submitting client's own HTTP response, and the
polling backstop — via `lastTurnRef` inside `applyRoundResult()`, which by
construction only runs once per real state transition. Trigger the dialog
open from inside that same function (when `payload.over` is true and this
is the first time it's being applied), not from a separate `useEffect`
watching `battle?.over` — a naive effect would refire the dialog on every
re-render after the player dismisses it, since `battle.over` stays `true`
for the rest of the session.

## End state

- [x] Winning a battle (bot or online) opens a dialog congratulating the
      player and correctly states whether a lootbox was earned — verify a
      bot win with no lootbox (75% of the time) shows "no lootbox," a bot
      win with one shows the reward, and an online win always shows the
      reward.
- [x] Losing a battle (bot or online) opens a distinct "better luck next
      time" dialog that never mentions a lootbox.
- [x] Both `BattleArena.tsx` and `OnlineBattle.tsx` render the same
      `BattleResultDialog` component — no duplicated markup between them.
- [x] The dialog opens exactly once per battle end in online play, even
      though "battle over" can arrive via broadcast, the mover's own
      response, and the poll backstop.
- [x] Dismissing the dialog leaves the existing rematch/reset UI usable
      underneath.
- [x] `npm run build` / `npm run lint` clean.

### Validation notes (2026-08-07)

- `npm run build` and `npm run lint` both clean.
- Built `components/ui/Modal.tsx` (fixed overlay + centered `.card` panel,
  closes on backdrop click or its `✕` button) and
  `components/battle/BattleResultDialog.tsx` on top of it, styled with new
  scoped classes in `app/globals.css` (`.modal-overlay`, `.modal-panel`,
  `.battle-result-dialog`, etc.) — no component library, per `main.md`.
- `BattleArena.tsx`: `reportBotResult()` now parses and returns
  `lootboxGranted` from `/api/battles/bot-result`'s response instead of
  discarding it; the dialog opens once the report resolves.
- `app/api/rooms/[code]/move/route.ts`: the normal-round branch's
  `roundResultPayload` now includes `lootboxGranted: Boolean(result.over &&
  result.winner)` (online wins are unconditional, so this is equivalent to
  "did this round end with a winner"). `OnlineBattle.tsx` derives its own
  `won`/`lootboxGranted` pair from `payload.winner === mySlot` inside
  `applyRoundResult()`, which already dedupes by `turnCount` — the dialog
  trigger lives inside that same dedup-checked function (not a separate
  `useEffect` on `battle?.over`), so it can only fire once regardless of
  whether broadcast, the mover's own HTTP response, or the poll backstop
  gets there first. The poll backstop path (which reads persisted
  `RoomState`, not the ephemeral round payload) derives the same boolean
  from `Boolean(state.over && state.winner)` — accurate for the same reason
  (unconditional grant), confirmed this doesn't diverge from the real
  server-side `lootboxGranted` value.
- Ran a temporary end-to-end validation (deleted after running) with real
  disposable Supabase accounts against a local dev server:
  - `/api/battles/bot-result` still returns a boolean `lootboxGranted`,
    `false` on every loss.
  - Two real accounts played a full online 3v3 battle to completion purely
    through `/api/rooms/[code]/move` (attacks + forced switches). The
    winning round's response had `lootboxGranted: true`; a follow-up query
    confirmed the winner had exactly 1 `lootboxes` row and the loser had 0.
  - `GET /battle` and `GET /online` both still render 200 with no error
    boundary for an authenticated session (new imports don't break SSR).
- Not verified (no browser automation tool available in this environment):
  actually seeing the dialog rendered — the win/loss text, the lootbox
  message branching, and dismiss-then-see-the-rematch-panel-underneath were
  reviewed by hand in the component code, not clicked through in a browser.
