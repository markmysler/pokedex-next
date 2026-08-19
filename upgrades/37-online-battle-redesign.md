# Step 37: Online Battle page — room setup, chat, rematch wiring

**Status: shipped**, 2026-08-19.

## Why here

Reuses everything 35 (shared battle components) and 36 (arena
responsive layout, team picker wiring) already established — this step
is specifically the parts unique to `/online`: room setup, waiting room,
live chat, and rematch, none of which exist in the bot flow. Depends on
35, 36.

Reference: `design/REDESIGN_TRACKER.md`'s Battle cluster artifact
("Online" stage — room code plate + chat panel).

## What changes

- **`components/online/OnlineBattle.tsx`**:
  - `#online-setup` (create/join room) restyles per the mockup's room
    setup card — no flow change.
  - Waiting-room state gets the `.code-plate` treatment (mono, wide
    letter-spacing, dashed border) for the room code — same visual
    component/class Friends' friend-code and Profile's friend-code use
    (step 33/38), reused here rather than a one-off.
  - Picking phase: same `TeamPicker` as step 36, already restyled — just
    confirm it renders correctly in this page's flow (locked-in waiting
    state included).
  - Battling phase: same `FighterCard`/`MoveButton`/arena responsive
    layout as step 36 — this page is the second (and last) consumer, so
    if 36 was done right this should mostly just work. Verify the
    forced-switch / opponent-locked messaging (`.online-status` text)
    still reads correctly styled.
  - Rematch panel (`.rematch-panel`) restyles per token/button changes —
    no logic change.
- **`components/online/ChatPanel.tsx`**: restyle message list + input
  row per the mockup's `.chat`/`.chatmsgs`/`.chatrow` treatment — own
  messages keep a distinct color (`var(--accent)` instead of the old
  hardcoded green) via the existing `.mine` class.
- **`app/(app)/online/page.tsx`**: no change expected beyond the shell.

## End state

- [x] Room setup, waiting room, and room-code display all match the
      mockup: `CardTab` headers on both the setup and waiting-room cards,
      an "or" divider between Create Room and the join-by-code row, and
      the waiting room's code now uses the exact `.friend-code-display`
      class Profile (step 33) and, later, Friends (step 38) use — same
      shared component, not a one-off, per the plan.
- [x] Chat panel restyled to a bubble layout (own messages right-aligned
      with an accent-tinted background via the existing `.mine` class,
      opponent messages left-aligned) with a `CardTab` header; send,
      scroll-to-bottom, and the 300-char limit are all untouched —
      exercised live with real messages both directions.
- [x] A full online battle played against a second real session (two
      separate signed-up accounts in two Playwright browser contexts):
      create room → join via code → both lock in teams → play to a
      completed battle → result dialog on both sides → request rematch →
      accept → both back at the team picker for a fresh round. Verified
      in both themes.
- [x] Battle log, fighter cards, move buttons, and forced-switch/opponent-
      turn messaging (`.online-status` inside `.log-container`) all
      confirmed visually correct live on this page — no code changes were
      needed for any of them (already correct from steps 31/35/36), this
      just confirms nothing about the Realtime/polling path broke them.
- [x] `npm run build` and `npm run lint` clean.

### Implementation notes

- **Console errors during the two-tab live test aren't zero, and that's
  correct, not a regression.** A handful of `Failed to load resource:
  400/409` entries appear when both simulated players act at almost the
  same instant — these are Chromium's automatic network-log message for
  any non-2xx fetch response, surfaced regardless of whether the app
  handled it. Traced to `app/api/rooms/[code]/move/route.ts` (unmodified
  by this step): `409` = "battle not active"/"waiting for opponent's
  forced switch", `400` = "invalid action"/validation failure — both are
  pre-existing, intentional guards against the inherent race of two real
  clients submitting concurrently, and `OnlineBattle.tsx`'s
  `submitAction` already catches `data.error` and surfaces it as
  `turnStatus` text rather than crashing (unmodified logic). First test
  run (tight fixed-interval polling, no back-off) produced ~7 of these
  and never finished within its round budget; second run gated each
  simulated player's next click on their own "Action submitted..."
  status text (avoiding *manufactured* races) and completed the full
  flow — room create → rematch-accepted — with only a handful of
  genuine near-simultaneous-action races left, all gracefully absorbed.
  Treating this as a step-37 bug and chasing it to literal zero would be
  chasing a property of concurrent PvP itself, not of this restyle.
- **`.select-bar`'s room-code display got a new `.room-code-chip`
  modifier**, distinct from the full `.friend-code-display` "code plate"
  — the compact inline bars (picking/battling phase headers) needed a
  smaller, single-line treatment, while the dedicated waiting-room card
  (where the code *is* the point of the screen) gets the full plate.
  Both read as "this is a code," just at different visual weights
  appropriate to their context.
- **This step required zero changes to arena/fighter-card/move-button
  CSS or components** — everything from steps 35/36 (SegmentedMeter
  meters, move-button layout, the 720px stacking breakpoint, `.battle-
  log`'s theme-correct colors) applied here automatically, confirming
  the "restyle once, both pages benefit" bet those steps made. Only
  `OnlineBattle.tsx`'s own online-specific screens (setup, waiting room,
  chat, rematch) needed real changes.
