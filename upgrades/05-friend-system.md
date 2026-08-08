# Step 5: Friend system (requests, presence, invite-to-battle)

## Why here

Independent of steps 1–4 — its UI (friends list, request cards, toast
notifications) is plain markup styled with the app's existing CSS
conventions, same as everything else in this plan. Ordered before step 6
because trading and friend chat only make sense between accounts that are
already friends.

## What changes

### Adding a friend: friend codes, not a user search
`profiles.display_name` has no uniqueness constraint today, so it can't
safely be used to look someone up. Rather than adding one (and handling
collisions at signup), reuse the pattern this app already leans on for
"share this with someone" — a short code, like `lib/roomCode.ts`'s
`generateRoomCode()` for battle rooms:

- `profiles` gets a new `friend_code` column (unique, short, generated once
  per account — extend `handle_new_user()`, the same trigger that already
  grants starters, with a `generateRoomCode()`-style retry-on-collision
  loop). Shown on the Profile page.
- Adding a friend means entering someone's friend code, not searching a
  directory — keeps this consistent with the room-code mental model
  already established, and sidesteps needing a searchable/public username
  index at all.

### Data model
```sql
create table friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending', -- 'pending' | 'accepted'
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
```
- RLS: a user can read rows where they're `requester_id` or `addressee_id`;
  insert as `requester_id`; update (accept/decline) only as `addressee_id`;
  delete (unfriend/cancel) as either party. Same defense-in-depth pattern
  as every other table here — Route Handlers use the secret key for the
  real logic, RLS policies are the backstop.
- No DB-level uniqueness constraint on the (requester, addressee) pair
  (matches this codebase's existing preference for app-level checks over
  DB constraints, e.g. `battle_rooms.status` has none either) — the
  request route checks for an existing row in either direction before
  inserting.
- **Reverse-request auto-accept**: if A requests B while a pending request
  from B to A already exists, accept that existing row instead of creating
  a second one — two people who both wanted to friend each other shouldn't
  end up with two dangling pending rows.

### Server
- `POST /api/friends/request` — body `{ friendCode }`; looks up the
  target's `user_id` by code, checks for an existing row in either
  direction (auto-accept if a reverse pending row exists, otherwise
  reject a duplicate), inserts, and pushes a live notification (see
  below) to the target.
- `POST /api/friends/[id]/respond` — body `{ accept: boolean }`,
  addressee-only; sets `status`/`responded_at` or deletes the row on
  decline; notifies the requester on acceptance.
- `DELETE /api/friends/[id]` — unfriend (accepted) or cancel (pending),
  either party.
- `GET /api/friends` — the caller's accepted friends plus pending
  incoming/outgoing requests, resolved to `display_name` the same way
  `lib/history.ts`/`lib/leaderboard.ts` already do (never expose email).

### App-wide live notifications
- New `lib/supabase/broadcast.ts` helper, `broadcastToUser(userId, event,
  payload)` — same `channel.httpSend()` mechanism as the existing
  `broadcastToRoom()`, just channel-named `user:${userId}` instead of
  `room:${code}`.
- New `components/ui/Toast.tsx` + a small `ToastProvider` (context +
  bottom-corner stack, auto-dismissing) if it doesn't exist yet by the time
  this step is built — see [main.md](main.md)'s "Key decisions already
  made". A plain fixed-position stack of `.card`-styled notifications, not
  a component-library import.
- New client component, mounted once at the app-shell level (wrapping
  `app/(app)/layout.tsx`'s children, since the layout itself is a Server
  Component and this needs a `"use client"` subscription): subscribes to
  `user:${currentUserId}` for the whole authenticated session, and renders
  incoming events as toasts via `ToastProvider` — friend request received,
  friend request accepted, battle invite received. This is the same
  Realtime-subscription shape `useRoomChannel.ts` already uses, just
  account-scoped instead of room-scoped and living above individual pages
  instead of inside one.
- `SideNav.tsx` gets a "Friends" link, with a small badge when there are
  unread pending incoming requests.

### Battle invites
"Invite" is a UI shortcut over the room-code flow that already exists
(original plan's step 5) — not a parallel system:
- Clicking "Battle" next to a friend calls the existing `POST /api/rooms`
  to create a real room, then `POST /api/friends/invite` (new, small) with
  `{ friendUserId, roomCode }` — verifies an accepted friendship exists
  between the caller and the target (403 otherwise), then
  `broadcastToUser(friendUserId, "battle-invite", { fromDisplayName,
  roomCode })`.
- The recipient's toast includes an "Accept" action that calls the
  existing `POST /api/rooms/${roomCode}/join` directly and navigates to
  `/online`. `OnlineBattle.tsx` gains a small addition — reading an
  optional `?code=` query param on mount to skip straight past the
  create/join screen once the join call already succeeded from the toast.

## End state

- [ ] Every account has a stable, unique friend code, generated
      automatically and visible on the Profile page.
- [ ] Sending a friend request by code, then accepting or declining it,
      works and is reflected correctly for both accounts.
- [ ] Requesting a friend who already has a pending request out to you
      auto-accepts instead of creating a duplicate row.
- [ ] A friend request and a friend-request-accepted event both surface as
      a live toast from anywhere in the app, not just the Friends page —
      verify by triggering one while sitting on, say, the Pokédex page.
- [ ] Only accepted friends can be sent a battle invite; inviting a
      non-friend is rejected server-side.
- [ ] Clicking "Battle" on a friend creates a real room via the existing
      `POST /api/rooms` and delivers a live invite; accepting it joins that
      exact room via the existing `POST /api/rooms/[code]/join` — no new
      parallel matchmaking system.
- [ ] `npm run build` / `npm run lint` clean.
