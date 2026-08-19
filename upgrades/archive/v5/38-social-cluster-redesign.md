# Step 38: Social & progression cluster — Friends, Trade/Chat, Notifications, History, Leaderboard

**Status: shipped**, 2026-08-19.

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

- [x] Friends, Friend Chat/Trade, Notifications, History, and
      Leaderboard all match their mockups in both themes — verified live
      (see below), including screenshots of every screen in both themes.
- [x] `.friend-code-display` ("code plate") is visually identical across
      its three consumers (Profile from step 33, Online's waiting room
      from step 37, and now Friends' own-code card) — same class, no
      per-page variant.
- [x] Friend request send/accept/decline/remove, trade propose/accept/
      decline, chat send, notification mark-read-on-mount, and battle
      invite accept all still function — this step is styling-only, no
      API/data-flow changes. Exercised live end-to-end with two real
      accounts: A sent B a request, B accepted, A proposed a trade, B
      accepted it, chat messages flowed both directions, notifications
      accumulated correctly for B (trade-offer, friend-message,
      friend-request), and a bot battle produced a real History row.
      Friend request decline/remove and battle-invite accept weren't
      separately re-exercised (their API routes are untouched by this
      styling-only step, and decline/remove use the exact same
      `.friend-row`/button markup already verified for accept/cancel).
- [x] List-row paddings/type sizes consistent across Notifications/
      History/Leaderboard — all three now share one CSS rule for
      background/radius/padding/font-size, and Notifications/History
      both adopted the same `32px 1fr auto` icon-chip grid Leaderboard
      already used, rather than three independently-tuned layouts.
- [x] Verified in both themes; Friends also checked at 390px mobile
      width (bottom-tab shell, reached via "More" per step 32) — the
      other four pages reuse the exact same `.card`/list-row/`CardTab`
      primitives already confirmed responsive in steps 33/34/36/37, so a
      second explicit mobile pass on identical markup wasn't repeated
      for each.
- [x] `npm run build` and `npm run lint` clean.

### Implementation notes

- **`.match-row`/`.leaderboard-row`/`.notification-row` unified onto one
  shared rule** (`background: var(--surface-2)`, `var(--r-md)` radius,
  `var(--s-3) var(--s-4)` padding, 13px font) instead of three separately-
  tuned values (previously 6/8/6px radius, 6px8/8px10/8px10 padding,
  13/14/13px font — close but not identical). `.friend-row`/`.trade-row`
  joined the same treatment, replacing their old plain `border-bottom`
  divider list with the same surface-2 card-row + gap shape everything
  else now uses.
- **History and Notifications both picked up Leaderboard's existing
  `32px 1fr auto` icon-chip grid**, rather than leaving Notifications'
  icon inline in the text (`{icon} {text}`) and History's emoji glued to
  the row's first word (`"🏆 Won"`). Both now render a dedicated
  `.match-row-icon`/`.notification-row-icon` chip as their own grid
  column — the actual "icon/avatar + primary line + muted meta line"
  shape `DESIGN_SYSTEM.md` describes, not just a shared background color.
- **`.match-row.win`/`.match-row.loss` finally landed on `--good`/`--bad`**
  — `.win` had been riding step 30's mechanical hardcoded-green-to-accent
  swap (documented in a code comment at the time as "the semantic remap
  is step 38"), and `.loss` was still a bare `#E74C3C` hex. Both are token
  references now, matching `.notification-row.unread` (still correctly
  on `--accent`, an identity/attention signal not a win/loss one) and
  `.leaderboard-row.me` (also correctly `--accent`, unchanged — "this row
  is you" isn't a semantic win/loss/good/bad signal either).
- **Friend rows get a small `.avatar-sm` circle** — same radial-gradient
  recipe as `.avatar-lg` (Profile, step 33) at 32px instead of 64px, for
  the "avatar circle + name + action buttons" shape the plan called for.
  No real avatar system exists (same "purely decorative placeholder"
  reasoning as `.avatar-lg`) — this is a second, smaller consumer of that
  same visual idea, not a new concept.
- **`PokemonMultiPicker`/`BattleInviteAcceptButton` needed zero changes**,
  confirming the plan's expectation — both already read entirely through
  already-restyled shared components (`PokemonInstanceCard`,
  `PokemonFilterBar`, `.btn-primary`).
- **Test setup snag, not a step bug**: fresh test accounts only own their
  3 starters, and starters can't be traded (`PokemonMultiPicker` disables
  them) — the first trade-flow validation attempt picked disabled starter
  cards and silently did nothing. Fixed by having both test accounts open
  their signup lootbox first (each account starts with exactly one) to
  get a tradeable non-starter Pokémon before building the trade offer.
