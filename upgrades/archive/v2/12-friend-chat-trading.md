# Step 12: Friend chat + trading

## Why here

Both features only make sense between two accounts that are already
friends, so this depends entirely on step 5. Last in the plan simply
because everything in steps 6-11 (security headers, leaderboard, nicknames,
team-picker parity, battle depth, sound effects) was added later and has no
dependency relationship with this step either way — trading benefits from
step 9's shared Pokémon-picker components existing first (see below), so it
sits after them.

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
  beyond "at least one," and there's no counter-offer negotiation — a
  trade is accept/decline as proposed, or a fresh offer replacing it.
- **Reversed after shipping (2026-08-08): starters are no longer
  tradeable.** This step originally shipped with starters tradeable (see
  above, and the same assumption in `upgrades/main.md`'s original "Key
  decisions" list) — explicitly revisited at the user's request once the
  discard/trade-up asymmetry became apparent (trade-up already excluded
  starters, discard and friend trading didn't). Now enforced at every
  layer: `POST /api/friends/[id]/trade` rejects a starter on either side
  of a proposed trade, `accept_trade()` independently re-validates
  `is_starter = false` for both the offered and requested ids at accept
  time (same "never trust a pre-check" principle the function's own
  ownership re-check already used), and `DELETE
  /api/inventory/pokemon/[id]` rejects discarding a starter too — so
  starters can now only ever leave an account by never leaving at all.
  Live-validated: discarding a starter is rejected and the row is
  confirmed untouched in Supabase; a starter on either side of a proposed
  trade is rejected with a starter-specific error; a trade offering a
  starter that somehow reached `accept_trade()` directly (bypassing the
  route-level check) is still rejected there too; and a normal
  non-starter trade still proposes, accepts, and swaps ownership exactly
  as this step originally validated.

### Client: trade UI
- A "Propose Trade" action on the friend chat page opens a trade builder:
  two multi-select grids (reusing step 9's shared `PokemonInstanceCard` +
  `PokemonFilterBar` + `filterAndSortPokemon()` — the same pieces
  `TeamPicker.tsx` was refactored onto — generalized from `TeamPicker`'s
  fixed "exactly 3" selection rule to "at least 1, no fixed max" for this
  context) — one for the caller's own inventory, one
  read-only-except-selectable view of the friend's inventory (fetched
  specifically for this screen, showing only what's needed to pick from:
  id/species/stats — not full account data).
- Pending trades between the two friends show as their own section on the
  chat page (not mixed into the message stream), each with accept/decline
  for the receiving side and cancel for the side that proposed it.

## End state

- [x] Two friends can exchange chat messages that persist across a page
      reload and are visible to whichever friend logs in later — unlike
      battle chat, this survives.
- [x] A message triggers an instant update in an open chat window, and a
      toast/badge notification (via step 5's account-level channel) when
      the recipient's chat window isn't open.
- [x] A trade offer can include one or more Pokémon from each side.
- [x] Accepting a valid trade atomically transfers every involved
      `pokemon_instances` row's `user_id` between the two accounts —
      verify directly in Supabase.
- [x] Accepting a trade where one of the offered/requested Pokémon was
      discarded or traded away since the offer was made is rejected
      outright, with neither side's inventory changed.
- [x] Declining or cancelling a trade leaves both inventories untouched.
- [x] Chat and trading are both impossible between two accounts that
      aren't confirmed friends (verify a direct API call is rejected, not
      just that there's no UI entry point for it).
- [x] `npm run build` / `npm run lint` clean.

### Validation notes (2026-08-08)

- `npm run build` and `npm run lint` both clean.
- This step needed a real schema change (`friend_messages`, `trade_offers`,
  `accept_trade()`) — pushed to `origin/main` (confirmed with the user
  first) and let the Supabase GitHub integration apply it, same as steps 5
  and 8. Confirmed applied by querying both live tables directly before
  running any other checks; the integration took noticeably longer than
  usual this time (several checks over ~8 minutes before the tables
  appeared, vs. a single check for earlier steps).
- Ran a temporary end-to-end validation (deleted after running) against a
  local dev server pointed at the now-migrated live Supabase project,
  using 3 disposable test accounts (two accepted friends, one stranger for
  gating checks) — 27 checks, all passing:
  - **Chat**: a message persists and is visible to both accounts across
    separate `GET` calls (simulating a reload), correctly labeled
    `mine`/not for each side.
  - **Real live delivery**, not just a plausible-looking HTTP 200 — same
    verification method step 5 used: opened two actual Supabase Realtime
    WebSocket subscriptions (the friendship-scoped channel an open chat
    window listens on, and the recipient's account-scoped channel the
    toast system listens on) and confirmed a message sent via `POST`
    actually arrived on *both* within ~2.5s.
  - **Gating**: messaging or trading over a friendship that's still
    `pending` (not yet accepted) is rejected with 403; a third account
    that isn't a party to a friendship at all gets 404 attempting to
    message, view its trade-builder inventory, or (implicitly, same code
    path) trade on it — ownership failures and "not found" aren't
    distinguishable from the response, consistent with this app's other
    ownership checks.
  - **Trade accept**: the offerer attempting to accept their own trade is
    rejected (`accept_trade()`'s own-identity check); the correct
    receiving friend accepting atomically flips both
    `pokemon_instances.user_id` values, verified by querying the rows
    directly, not just trusting the 200 response; `trade_offers.status`
    and `resolved_at` update correctly.
  - **Stale trade rejection**: proposed a trade, then deleted the offered
    Pokémon directly (same end state a discard produces) before accepting
    — the accept was rejected, the *other* (requested) Pokémon was
    confirmed to NOT have moved, and the trade's status was confirmed to
    still be `pending`, not silently resolved. This is the atomicity
    guarantee `accept_trade()` exists for, verified directly rather than
    assumed from the function reading correctly.
  - **Decline/cancel**: both leave ownership completely untouched,
    verified directly.
- Not independently verified via a real browser (no browser automation
  tool available in this environment): the trade builder's two-grid UI
  (`PokemonMultiPicker` reused for both sides), the pending-trades section
  rendering, and the "💬 Chat" toast's "Open" button actually navigating.
  The underlying data each of these renders from was confirmed live above
  (real messages, real trades, real WebSocket delivery), and the component
  code was reviewed by hand — same category of gap flagged in steps 5, 8,
  9, and 10's validation notes.
- One deliberate simplification flagged, not a bug: after a trade
  resolves, the friend-chat page's in-memory inventory grids (used to
  build a *new* trade offer) don't auto-refresh to reflect the swap —
  they're seeded once from the server on page load. A full page reload
  picks up the new ownership correctly (confirmed via the DB-level checks
  above); the trade-builder session itself doesn't live-patch mid-session.
  Worth revisiting if it turns out to matter in practice, not treated as a
  blocker for this step.

### Addendum (2026-08-08): starters made untradeable

Reversed the "starters are tradeable" assumption above at the user's
request — see the note under "Trading" for the reasoning. Live-validated
against the migrated Supabase project with 2 disposable accounts (13
checks, all passing):
- Discarding a starter is rejected with a starter-specific error, and the
  row is confirmed to still exist in Supabase afterward.
- Discarding a non-starter still works exactly as before, including the
  released counter still incrementing by 1.
- Proposing a trade with a starter as the offered Pokémon is rejected.
- Proposing a trade requesting the friend's starter is rejected.
- Neither rejected proposal moved any Pokémon.
- `accept_trade()`'s own re-validation was exercised directly, not just
  through the route: inserted a `trade_offers` row containing a starter
  by going straight through the admin client (bypassing the route-level
  pre-check entirely), then called `accept_trade()` on it — rejected, and
  the starter was confirmed to not have moved.
- A normal non-starter trade still proposes, accepts, and swaps ownership
  correctly end to end, confirming this change didn't regress the trade
  flow already validated above.
