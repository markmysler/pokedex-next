# Step 6: In-match chat

## Why last

Fully additive and independent of every other step — doesn't touch the battle data model, room lifecycle, or auth beyond needing a logged-in display name to label messages. Left last as polish since nothing else depends on it.

## What changes

### Transport
Unlike battle moves, chat messages aren't a cheating vector — there's nothing to validate or trust server-side, so there's no reason to round-trip through a Route Handler the way `move`/`lock-in` do. Send messages directly browser-to-browser over the existing Supabase Realtime channel for the room (`room:${code}`, the same channel `useRoomChannel.ts` already subscribes to):
- Client calls `channel.send({ type: "broadcast", event: "chat-message", payload: { text, senderDisplayName } })` directly from the browser using the publishable key — no new API route needed.
- `useRoomChannel.ts` gets a new handler, `onChatMessage`, alongside the existing `onBattleStart`/`onRoundResult`/etc.

### Persistence
None. Messages live only in each client's local component state for the duration of the battle and are dropped when the room ends or the page reloads. (If this turns out to be wanted later, it's a small add-on: a `battle_chat` table plus writing through a Route Handler instead of sending client-to-client — but don't build that speculatively now.)

### Client
- New `components/online/ChatPanel.tsx` — text input + scrolling message list, similar shape to the existing battle log `<pre>` in `OnlineBattle.tsx`.
- Wire into `OnlineBattle.tsx` alongside the existing battle UI, visible for the duration of the room (setup, picking, and battling phases — not just during active combat).

## End state

- [ ] Messages sent by one player appear in the other player's chat panel in real time without a page reload.
- [ ] Messages are labeled with the sender's `display_name` (from step 1's `profiles` table), not a raw user ID.
- [ ] Chat messages are not persisted anywhere — confirm no new table/row is created in Supabase when messages are sent.
- [ ] Leaving or closing the room clears the chat panel; rejoining (including via rematch, step 4) starts with an empty panel.
- [ ] `npm run build` / `npm run lint` clean.
