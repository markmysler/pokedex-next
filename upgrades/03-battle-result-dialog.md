# Step 3: Battle result dialog (win/loss + lootbox reveal)

## Why here

Right now a battle ending is just a line in the log and a status message —
easy to miss, and the game never actually tells you whether you earned a
lootbox. This step adds a real modal moment. It's ordered after step 1
(needs shadcn `Dialog`) and step 2 (bot battles are now the same 3v3 shape
as online, so this is one dialog, not two).

## What changes

### Shared component
- New `components/battle/BattleResultDialog.tsx` (shadcn `Dialog`), used by
  both `BattleArena.tsx` (bot) and `OnlineBattle.tsx` (online):
  - **Win**: congratulatory message + either "🎁 You earned a lootbox!" or
    "No lootbox this time" — truthfully, not just "you won so you probably
    got one," since bot wins are only a 25% roll.
  - **Loss**: a distinct "Better luck next time" message. Never mentions a
    lootbox — losers never get one, in either mode.
  - A primary action to dismiss, revealing the existing post-battle UI
    underneath (the rematch prompt for online, the reset/auto-battle
    controls for bot battles — this step doesn't touch either of those).
  - Once step 5 exists, a lootbox-earned dialog gets a second action —
    "Open it now" — that jumps straight into the card-pack reveal flow
    instead of leaving the player to find it in Inventory later. Not
    buildable yet in this step (step 5 doesn't exist), so land it as a
    small follow-up edit to this dialog when step 5 is actually built,
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

- [ ] Winning a battle (bot or online) opens a dialog congratulating the
      player and correctly states whether a lootbox was earned — verify a
      bot win with no lootbox (75% of the time) shows "no lootbox," a bot
      win with one shows the reward, and an online win always shows the
      reward.
- [ ] Losing a battle (bot or online) opens a distinct "better luck next
      time" dialog that never mentions a lootbox.
- [ ] Both `BattleArena.tsx` and `OnlineBattle.tsx` render the same
      `BattleResultDialog` component — no duplicated markup between them.
- [ ] The dialog opens exactly once per battle end in online play, even
      though "battle over" can arrive via broadcast, the mover's own
      response, and the poll backstop.
- [ ] Dismissing the dialog leaves the existing rematch/reset UI usable
      underneath.
- [ ] `npm run build` / `npm run lint` clean.
