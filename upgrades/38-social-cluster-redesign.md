# Step 38: Social & progression cluster — Friends, Trade/Chat, Notifications, History, Leaderboard

**Status: not started**

## Why here

Independent of the battle cluster (35–37) — only depends on 30, 31, 32.
Ordered last among the page-wiring steps because it's almost entirely
list-shaped screens reusing patterns already proven out in 33/34 (list
rows, `CardTab`, pills), so it's the lowest-risk remaining surface and a
good place to mop up any shared-pattern inconsistencies noticed while
building the earlier clusters.

Reference: `design/REDESIGN_TRACKER.md`'s Social cluster artifact.

## What changes

- **`components/friends/FriendsPageClient.tsx`**: friend-code card gets
  the shared `.code-plate` treatment (same class introduced/used in 33
  and 37 — third consumer, confirms it's genuinely reusable). Incoming/
  outgoing/friends-list cards get `CardTab` headers. Row shape
  (`.friend-row`) restyles per mockup — avatar circle + name + action
  buttons.
- **`components/friends/FriendChatPageClient.tsx`**: trade cards
  (`.trade-row`) restyle — offered/requested `PokemonInstanceCard`s
  (already restyled in 34) inside the existing `⇄` arrow layout, per
  mockup. Trade builder reuses `PokemonMultiPicker`
  (`components/pokemon/PokemonMultiPicker.tsx`, itself just
  `PokemonFilterBar` + `PokemonInstanceCard` grid, both already restyled
  by 31/34 — confirm here, no new work expected). `ChatPanel` reuse —
  same component step 37 already restyled, second consumer.
- **`app/(app)/notifications/page.tsx`**: `.notification-row` restyles —
  unread state keeps the left accent stripe (now `var(--accent)`
  instead of the old green), icon/text/date layout per mockup.
  `BattleInviteAcceptButton`'s button restyles via step 31's button
  classes, no behavior change.
- **`app/(app)/history/page.tsx`**: `.match-row`/`.match-row-detailed`
  restyle — win/loss left stripe uses `var(--good)`/`var(--bad)`.
- **`app/(app)/leaderboard/page.tsx`**: `.leaderboard-row` restyle,
  "me" row highlight uses `var(--accent)` outline instead of the old
  green border.
- All five screens share the same underlying list-row shape (icon/avatar
  + primary line + muted meta line, per `DESIGN_SYSTEM.md`) — worth a
  final cross-check that Notifications/History/Leaderboard's row
  paddings/font-sizes actually match each other, not just each
  individually matching its own mockup panel.

## End state

- [ ] Friends, Friend Chat/Trade, Notifications, History, and
      Leaderboard all match their mockups in both themes.
- [ ] `.code-plate` is visually identical across its three consumers
      (Profile, Online waiting room, Friends).
- [ ] Friend request send/accept/decline/remove, trade propose/accept/
      decline, chat send, notification mark-read-on-mount, and battle
      invite accept all still function — this step is styling-only, no
      API/data-flow changes.
- [ ] List-row paddings/type sizes consistent across Notifications/
      History/Leaderboard (visual spot-check, not just per-page).
- [ ] Verified in both themes and at mobile (bottom-tab shell, these are
      all reached via "More" on mobile per step 32) and desktop widths.
- [ ] `npm run build` clean.
