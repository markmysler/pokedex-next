# Step 37: Online Battle page — room setup, chat, rematch wiring

**Status: not started**

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

- [ ] Room setup, waiting room, and room-code display all match the
      mockup, including the `.code-plate` styling shared with
      Friends/Profile.
- [ ] Chat panel restyled, own vs. opponent messages visually
      distinguishable, unchanged behavior (send, scroll-to-bottom,
      300-char limit).
- [ ] A full online battle played against a second test session/tab
      (create room → join via code → both lock in teams → play to
      completion → request/accept rematch) works end-to-end with the
      new styling, no console errors, in both themes.
- [ ] Battle log, fighter cards, move buttons, forced-switch messaging
      all confirmed visually correct in this page specifically (not just
      assumed from step 36, since Realtime/polling state changes can
      expose timing-related rendering issues the bot flow never hits).
- [ ] `npm run build` clean.
