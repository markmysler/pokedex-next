# Step 6: Friend chat + trading

## Why here

Both features only make sense between two accounts that are already
friends, so this depends entirely on step 5. Grouped into one step because
the trade-offer UI naturally lives inside the friend chat surface, not as
a separate disconnected screen.

## What changes

### Friend chat — persistent, unlike battle chat
The original plan's step 8 (in-match battle chat) is deliberately ephemeral
— client-to-client, nothing stored, gone when the room ends. Friend DMs
need the opposite property: two friends are very unlikely to both be online
at once, so messages have to survive until whoever's offline logs back in.

```sql
create table friend_messages (
  id uuid primary key default gen_random_uuid(),
  friendship_id uuid not null references friendships(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);
```
- RLS: readable/insertable only by the two accounts on that
  `friendship_id`'s row (`requester_id`/`addressee_id` — same check shape
  used everywhere else here, just referencing `friendships` instead of
  `battle_rooms`).
- `GET /api/friends/[id]/messages` — most recent messages for that
  friendship (simple limit/offset is enough at this scale, no need for
  cursor pagination yet).
- `POST /api/friends/[id]/messages` — inserts the row, then:
  - broadcasts it on a new per-friendship Realtime channel
    (`friendship:${friendshipId}`) for instant delivery to a friend who
    currently has the chat open — same shape as `room:${code}` for battles,
    just friendship-scoped.
  - also calls step 5's `broadcastToUser()` on the recipient's account
    channel, so a toast/badge shows up even if they're elsewhere in the
    app, not just when the chat window is open.
- Client: `app/(app)/friends/[id]/page.tsx`, reusing `ChatPanel.tsx`
  (built for battle chat) as-is for the message list/input — it was
  already a purely presentational `{ messages, onSend }` component, so
  swapping its backing data source from room-ephemeral to
  friendship-persistent needs no changes to that component itself.

### Trading
```sql
create table trade_offers (
  id uuid primary key default gen_random_uuid(),
  friendship_id uuid not null references friendships(id) on delete cascade,
  offered_by uuid not null references auth.users(id) on delete cascade,
  offered_instance_ids jsonb not null,   -- pokemon_instances ids owned by offered_by
  requested_instance_ids jsonb not null, -- pokemon_instances ids owned by the other friend
  status text not null default 'pending', -- 'pending' | 'accepted' | 'declined' | 'cancelled'
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
```
- Only creatable between two accounts with an **accepted** friendship.
- `POST /api/friends/[id]/trade` — validates every `offered_instance_ids`
  id belongs to the caller and every `requested_instance_ids` id belongs
  to the other friend (same `getOwnedPokemonInstances()`-style batch
  ownership check used for 3v3 team lock-in), then inserts a `pending` row
  and notifies the other friend (both channels, same as chat messages).
- **Accepting is real, irreversible ownership transfer** — worth being
  stricter here than most of this app's other atomic updates. New Postgres
  function, `accept_trade(p_trade_id uuid)`:
  - re-validates *at accept time* that every offered/requested id is still
    owned by the expected account and the trade is still `pending` (an
    inventory can change between offer and accept — e.g. an offered
    Pokémon gets discarded, or traded away in a different pending trade —
    and a stale offer must be rejected outright, not partially applied);
  - if valid, updates `pokemon_instances.user_id` for every offered id to
    the accepting account and every requested id to the offering account,
    and sets the trade's `status = 'accepted'`, all inside the function's
    single implicit transaction — a plain sequence of Route-Handler-side
    `UPDATE`s (like `recordBattleEnd()` uses for match results) isn't
    strong enough here, because a failure partway through would leave
    Pokémon transferred on one side but not the other.
  - `POST /api/friends/trade/[id]/accept` calls this RPC and surfaces
    either success or the specific validation failure.
- `POST /api/friends/trade/[id]/decline` (either party) — just flips
  `status`, no ownership change.
- Default assumptions carried over from `upgrades/main.md`, flagged for
  revisiting once built: no cap on how many Pokémon either side can offer
  beyond "at least one," starters are tradeable, and there's no
  counter-offer negotiation — a trade is accept/decline as proposed, or
  a fresh offer replacing it.

### Client: trade UI
- A "Propose Trade" action on the friend chat page opens a trade builder:
  two multi-select grids (reusing `TeamPicker.tsx`'s selection-grid pattern,
  generalized from its current fixed "exactly 3" rule to "at least 1, no
  fixed max" for this context) — one for the caller's own inventory, one
  read-only-except-selectable view of the friend's inventory (fetched
  specifically for this screen, showing only what's needed to pick from:
  id/species/stats — not full account data).
- Pending trades between the two friends show as their own section on the
  chat page (not mixed into the message stream), each with accept/decline
  for the receiving side and cancel for the side that proposed it.

## End state

- [ ] Two friends can exchange chat messages that persist across a page
      reload and are visible to whichever friend logs in later — unlike
      battle chat, this survives.
- [ ] A message triggers an instant update in an open chat window, and a
      toast/badge notification (via step 5's account-level channel) when
      the recipient's chat window isn't open.
- [ ] A trade offer can include one or more Pokémon from each side.
- [ ] Accepting a valid trade atomically transfers every involved
      `pokemon_instances` row's `user_id` between the two accounts —
      verify directly in Supabase.
- [ ] Accepting a trade where one of the offered/requested Pokémon was
      discarded or traded away since the offer was made is rejected
      outright, with neither side's inventory changed.
- [ ] Declining or cancelling a trade leaves both inventories untouched.
- [ ] Chat and trading are both impossible between two accounts that
      aren't confirmed friends (verify a direct API call is rejected, not
      just that there's no UI entry point for it).
- [ ] `npm run build` / `npm run lint` clean.
