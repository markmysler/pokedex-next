# Step 17: Persistent notifications

## Why here

Independent of steps 16 and 18. The biggest of the three — a real new
table plus a new page — done after the quick tooltip fix (16) simply
because it's more involved, and before 18 for no particular reason (they
don't interact).

## What changes

### The gap
`FriendNotifications.tsx` (mounted app-wide since the original friend
system) already surfaces six kinds of live event as a toast: friend
request, friend request accepted, battle invite, friend message, trade
offer, trade resolved. All six are pushed via `broadcastToUser()` from
the Route Handler that causes them
(`app/api/friends/request/route.ts`, `.../respond/route.ts`,
`.../invite/route.ts`, `.../[id]/messages/route.ts`,
`.../[id]/trade/route.ts`, `.../trade/[id]/accept|decline/route.ts`).
A toast is a Realtime broadcast only — nothing is stored. If the
recipient isn't looking at the screen when it fires, or refreshes a
moment later, it's gone.

For four of the six kinds, the underlying *state* already survives a
refresh somewhere else in the app even though the toast doesn't: an
incoming friend request is still listed on `/friends`, a pending trade
offer is still listed on `/friends/[id]`, a friend message is still in
that chat's history, and "friend request accepted" just reflects the
friends list itself. **Battle invites are the one kind with nothing
recoverable anywhere** — a `battle_rooms` row doesn't record who was
invited to it, so once the toast is gone, the invitee has no way to find
that room again except the host re-sending it.

### Server
```sql
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null, -- 'friend-request' | 'friend-request-accepted' |
                       -- 'battle-invite' | 'friend-message' |
                       -- 'trade-offer' | 'trade-resolved'
  payload jsonb not null, -- same shape already passed to broadcastToUser()
  created_at timestamptz not null default now(),
  read_at timestamptz
);
```
- RLS: a user can select/update only their own rows. Inserts happen only
  server-side (secret key), same trust boundary as every other table
  here.
- `lib/notifications.ts`'s `createNotification(supabase, userId, kind,
  payload)` — a thin insert wrapper. Called once, alongside the existing
  `broadcastToUser()` call, at each of the 7 call sites listed above
  (`friend-request-accepted` fires from two different routes: a request
  that resolves an existing mutual pending request, and an explicit
  accept). Reuses the exact payload object already being broadcast — no
  new shape to invent or keep in sync.
- `GET /api/notifications` — the current user's notifications, newest
  first, capped at some reasonable limit (50). For any `battle-invite`
  row, resolves whether the room is still actually joinable (`status =
  'waiting_for_players'` and no `player2_id`) so the client doesn't offer
  to accept an invite that's already stale — same staleness a toast's own
  `accept()` handler surfaces reactively today, checked proactively here
  instead.
- `POST /api/notifications/read-all` — marks every currently-unread
  notification for the caller as read, one bulk update. Called once when
  the Notifications page loads (see below) — no per-item "mark read"
  control, simplest semantics that match how visiting `/friends` already
  implicitly "handles" incoming requests today.
- `AppLayout` (`app/(app)/layout.tsx`) gains an `unreadNotificationCount`
  query alongside its existing `pendingFriendRequestCount` one, passed to
  `SideNav` for a badge on the new nav link — same `.nav-link-badge`
  pattern already used for pending friend requests.

### Client
- New `/notifications` page (added to `SideNav`'s `LINKS`) — Server
  Component listing every notification: unread ones visually distinct
  (a left accent, matching `.match-row.win`'s pattern), each rendering
  differently by `kind`:
  - `friend-request` / `friend-request-accepted` — informational, links
    to `/friends`.
  - `friend-message` / `trade-offer` / `trade-resolved` — links to
    `/friends/[friendshipId]` (from the payload).
  - `battle-invite` — the one kind with a real inline action: if the
    room's still joinable (resolved server-side above), a client
    "Accept" button that does exactly what `BattleInviteToast` already
    does (`POST /api/rooms/[code]/join`, then navigate to
    `/online?code=...`); otherwise a muted "This invite is no longer
    available" note instead of a dead button.
  - Marks everything as read via `POST /api/notifications/read-all` on
    load (fire-and-forget, doesn't block the render).
- `FriendNotifications.tsx` itself is unchanged — the live toast UX for
  someone actively in the app stays exactly as it is; this step is purely
  additive (a persisted, browsable history alongside it), not a
  replacement.

## End state

- [x] Refreshing the page (or never having seen the toast) no longer
      loses a battle invite — it's still listed and still acceptable on
      `/notifications`, verified directly (not just trusting the UI):
      invite sent, recipient never looks, recipient loads `/notifications`
      fresh, invite is there.
- [x] Accepting a battle invite from the Notifications page actually
      joins the room and navigates in, same as accepting the toast does.
- [x] A stale battle invite (room already started, already full, or
      already left) shows as unavailable rather than a button that fails
      confusingly on click.
- [x] All six event kinds actually produce a row in `notifications` for
      the recipient when they fire — verify directly in Supabase, not
      just via the toast still working.
- [x] The sidebar's unread-notifications badge count matches reality, and
      opening `/notifications` clears it (all currently-listed
      notifications become read).
- [x] A user can't see another account's notifications via a direct API
      call.
- [x] `npm run build` / `npm run lint` clean.

### Validation notes (2026-08-08)

- `npm run build` and `npm run lint` both clean.
- This step needed a real schema change (`notifications` table) — pushed
  to `origin/main` (confirmed with the user first) and let the Supabase
  GitHub integration apply it, same as every prior migration-bearing step.
  Already applied by the time it was checked (a single check, no
  polling needed).
- **Bug caught and fixed during validation, not by code review**: the
  first validation run showed a battle invite listed but with no "Accept"
  button, on a room that had genuinely just been created and was still
  open. Root cause: `getNotificationsForUser()`'s joinability check
  compared `battle_rooms.status` against the literal string `"waiting"` —
  copied from that column's schema-level *default value* in the original
  auth migration, not the actual string the application code uses.
  `POST /api/rooms` and `POST /api/rooms/[code]/join` both actually use
  `"waiting_for_players"`, a different string, so the comparison never
  matched and every invite looked stale regardless of the room's real
  state. Fixed by matching the real string the room routes use; re-ran
  validation to confirm the Accept button now appears for a genuinely
  open room and correctly disappears (replaced by "no longer available")
  once that same room is claimed by someone else.
- Ran a temporary end-to-end validation (deleted after running) against a
  local dev server pointed at the migrated live Supabase project, using 2
  disposable test accounts — 25 checks, all passing:
  - **All 6 event kinds** (friend-request, friend-request-accepted,
    battle-invite, friend-message, trade-offer, trade-resolved) confirmed
    to produce a `notifications` row for the recipient, checked directly
    in Supabase after triggering each one for real through its actual
    Route Handler (friend request, accept, room invite, chat message,
    propose trade, accept trade).
  - **The core scenario this step exists for**: sent a battle invite,
    never triggered the recipient's live toast (no WebSocket subscription
    opened for it, simulating "user was offline or refreshed"), then
    fetched `/notifications` fresh and confirmed the invite was still
    there with a working Accept button — joining through it actually made
    the recipient `player2` in the real `battle_rooms` row, verified
    directly.
  - **Staleness**: after that same room was claimed, re-fetching
    `/notifications` showed "This invite is no longer available" instead
    of a dead button.
  - **Unread badge**: confirmed present on an unrelated page (Dashboard)
    while unread notifications existed, and confirmed `POST
    /api/notifications/read-all` (the route `MarkAllReadOnMount` calls)
    actually zeroes out unread count in Supabase.
  - **Ownership**: a user's own `GET /api/notifications` call succeeds
    and never contains the other test account's notification ids.
- Not independently verified via a real browser (no browser automation
  tool available in this environment): `MarkAllReadOnMount`'s actual
  auto-fire-on-page-load behavior — a raw HTTP fetch retrieves only the
  server-rendered HTML and never executes client-side JavaScript, so this
  was validated by calling `POST /api/notifications/read-all` directly
  instead (the same endpoint that effect calls), confirming the endpoint
  itself works correctly; the effect's wiring (`useEffect` firing once on
  mount) was reviewed by hand. Also unverified: the sidebar badge's exact
  visual placement/rendering, and the accept button's disabled/loading
  state during the request. Same category of gap flagged in every prior
  step's validation notes.
