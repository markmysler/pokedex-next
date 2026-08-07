# Step 4: Rematch (same room code)

## Why here

Reuses the `TeamPicker`/lock-in flow built in step 3 almost as-is — "same or different Pokemon" is just running that flow again. Doing this before 3v3 would mean building a rematch flow for 1v1 and then reworking it anyway once teams exist.

## What changes

### Server
- New `POST /api/rooms/[code]/rematch/request` — either player, only valid once `battle_rooms.status === "over"`. Broadcasts a `rematch-requested` event naming the requesting player; does not change room state yet.
- New `POST /api/rooms/[code]/rematch/accept` — the *other* player confirms. On accept, the server resets the existing `battle_rooms` row in place (same `code`, same row): `status` back to `picking`, `state` cleared of teams/HP/MP/pending, keep `player1_id`/`player2_id` as-is. Broadcasts `rematch-started`.
- If the requesting player wants to decline instead, or simply leaves, the existing `leave` flow already handles ending the room — no new decline endpoint needed.

### Client
- When `battle.over` is true, show a "Request Rematch" button alongside the existing result state.
- On receiving `rematch-requested` (for the non-requesting player), show an accept/decline-style prompt (decline = leave room, matching existing behavior).
- On receiving `rematch-started`, drop straight back into the step 3 `TeamPicker` flow, reusing `applyBattleStart`-style state resets already in `OnlineBattle.tsx`.

## End state

- [ ] After a battle ends, either player can request a rematch; the other player sees a prompt and must explicitly accept before anything resets.
- [ ] Accepting keeps the same room code — verify in the Supabase table editor that no new `battle_rooms` row is created, the existing row's `state`/`status` just change.
- [ ] Both players can pick the same teams again or different ones via the reused `TeamPicker`, and the resulting battle behaves identically to a fresh one (mana/HP reset, no leftover state from the previous battle).
- [ ] Leaving instead of accepting a rematch request behaves the same as leaving does today (opponent notified, room ends).
- [ ] `npm run build` / `npm run lint` clean.
