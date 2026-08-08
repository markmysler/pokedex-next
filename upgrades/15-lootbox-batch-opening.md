# Step 15: Open multiple lootboxes at once

## Why here

Builds on step 4's `LootboxRevealDialog` (already shipped) — no new plan
dependency, but sequenced after step 14 since trade-up makes it
meaningfully more likely someone has several lootboxes sitting unopened at
once. Today `InventoryPageClient.tsx` renders one "📦 Open Lootbox" button
per unopened lootbox — fine for one or two, unwieldy for a wall of buttons
once someone's been playing a while (or just traded up several times).

## What changes

### Server: claim N at once, atomically
New Postgres function, same atomic-claim shape as the existing single-open
`UPDATE ... WHERE opened_at IS NULL RETURNING` pattern, generalized to a
batch with `FOR UPDATE SKIP LOCKED` so concurrent opens (e.g. two tabs)
can't double-claim the same row:
```sql
create or replace function claim_lootboxes(p_user_id uuid, p_count int)
returns setof lootboxes
language sql
as $$
  update lootboxes
  set opened_at = now()
  where id in (
    select id from lootboxes
    where user_id = p_user_id and opened_at is null
    order by created_at asc
    limit p_count
    for update skip locked
  )
  returning *;
$$;
```
If fewer than `p_count` are actually available (a race with another claim,
or the client's count was stale), this simply returns fewer rows than
requested rather than erroring — the Route Handler rolls a Pokémon for
however many were actually claimed and reports that number back, not the
requested one.

- `POST /api/inventory/lootboxes/open-many` (new) — body `{ count: number
  }`. Calls `claim_lootboxes`, then for each claimed row runs the exact
  same roll-and-insert logic `POST /api/inventory/lootboxes/[id]/open`
  already uses (species roll → `rollInstance()` → insert
  `pokemon_instances`) — factor that shared piece into
  `lib/inventory.ts` (e.g. `rollAndPersistLootboxPokemon()`) so the
  single-open route and this new route call one implementation instead of
  duplicating it. Returns `{ pokemon: OwnedPokemon[] }`, one entry per box
  actually opened, in the order they were claimed.

### Client: quantity picker
- `InventoryPageClient.tsx`'s "Unopened Lootboxes" card: when there's
  exactly 1, keep today's single "📦 Open Lootbox" button as-is — no
  stepper needed for one item. When there's more than 1, replace the
  per-box button list with: the count ("You have N unopened lootboxes"),
  a `-`/number-input/`+` quantity stepper clamped to `[1, N]`, and one
  "Open {qty} Lootbox(es)" button that calls the new batch endpoint.

### Client: queued reveal
`LootboxRevealDialog` gains a `hasNext: boolean` prop — when true, its
terminal button reads "➡️ Next" instead of "✅ Continue" (still calls the
same `onClose` callback; the parent decides what "close" means). Skip
behavior during the animation is unchanged — it only affects the *current*
box's reveal, not the queue.

`InventoryPageClient.tsx` holds the batch response as a queue
(`revealQueue: OwnedPokemon[]`) instead of a single `revealPokemon`:
- Renders `LootboxRevealDialog` for `revealQueue[0]`, keyed on that
  Pokémon's `id` — the key change forces a full remount on every queue
  advance, which is what resets the dialog's internal phase/reveal state
  back to "drumroll" for free, with no special reset logic needed inside
  the dialog itself.
- `hasNext={revealQueue.length > 1}`.
- The dialog's close handler shifts the queue (`setRevealQueue(q =>
  q.slice(1))`); once the queue empties, the dialog simply stops
  rendering — same as today's single-reveal close.
- Local inventory state (`pokemon`, `lootboxes`) updates immediately from
  the batch response, same as today's single-open flow — all newly rolled
  Pokémon show up in the grid right away, not just once the whole queue is
  dismissed.

## End state

- [ ] With exactly 1 unopened lootbox, the Inventory page looks and works
      exactly as it does today (no stepper shown).
- [ ] With more than 1, a quantity stepper appears, clamped to the actual
      number available; opening N runs the reveal sequence N times in a
      row, each showing "➡️ Next" except the last, which shows "✅
      Continue"/closes.
- [ ] Skipping an individual reveal's animation still works mid-queue and
      doesn't skip the *next* box's animation too.
- [ ] All N newly-rolled Pokémon are correctly reflected in Inventory
      (grid/list/detail) by the time the queue finishes, matching exactly
      what the batch endpoint returned — confirm via network inspection,
      same "never re-rolls" guarantee step 4 established for single opens.
- [ ] Requesting more lootboxes than currently available is rejected (or
      clamped) rather than erroring confusingly.
- [ ] Two concurrent batch-open requests (e.g. two tabs) never double-claim
      the same lootbox.
- [ ] `npm run build` / `npm run lint` clean.
