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

- [x] With exactly 1 unopened lootbox, the Inventory page looks and works
      exactly as it does today (no stepper shown).
- [x] With more than 1, a quantity stepper appears, clamped to the actual
      number available; opening N runs the reveal sequence N times in a
      row, each showing "➡️ Next" except the last, which shows "✅
      Continue"/closes.
- [x] Skipping an individual reveal's animation still works mid-queue and
      doesn't skip the *next* box's animation too.
- [x] All N newly-rolled Pokémon are correctly reflected in Inventory
      (grid/list/detail) by the time the queue finishes, matching exactly
      what the batch endpoint returned — confirm via network inspection,
      same "never re-rolls" guarantee step 4 established for single opens.
- [x] Requesting more lootboxes than currently available is rejected (or
      clamped) rather than erroring confusingly.
- [x] Two concurrent batch-open requests (e.g. two tabs) never double-claim
      the same lootbox.
- [x] `npm run build` / `npm run lint` clean.

### Validation notes (2026-08-08)

- `npm run build` and `npm run lint` both clean.
- This step needed a real schema change (`claim_lootboxes()`) — pushed to
  `origin/main` (confirmed with the user first) and let the Supabase GitHub
  integration apply it, same as steps 5, 8, 12, 13, and 14. Confirmed
  applied by calling the RPC directly for a nonexistent user and getting an
  empty array back (a real, successful call) rather than a "function not
  found" error, before running any other checks.
- Ran a temporary end-to-end validation (deleted after running) against a
  local dev server pointed at the now-migrated live Supabase project, using
  2 disposable test accounts — 17 checks, all passing:
  - **Single-lootbox path unaffected**: `POST
    /api/inventory/lootboxes/[id]/open` (unchanged endpoint, now backed by
    the shared `rollAndPersistLootboxPokemon()` helper instead of its own
    inline roll logic) still succeeds and still claims exactly that one box.
  - **N of M**: seeded 7 unopened lootboxes, opened 4 via
    `open-many` — verified directly in Supabase that exactly 4 are now
    `opened_at`-stamped, exactly 3 remain unopened, and the 4
    `pokemon_instances` rows actually created match the batch response's
    ids exactly (the "never re-rolls" guarantee, checked against the
    database rather than trusting the response).
  - **Over-request clamping**: with 3 lootboxes left, requesting 10 returns
    200 with exactly 3 Pokémon (not an error, not 10) — matches the plan's
    "rolls a Pokemon for however many were actually claimed" behavior.
  - **Invalid counts rejected**: `count: 0` and `count: -1` are both
    rejected before touching the database.
  - **Concurrency — the core guarantee this step's `FOR UPDATE SKIP
    LOCKED` exists for**: seeded 10 lootboxes for one account, then fired
    two `open-many({count: 6})` requests genuinely concurrently
    (`Promise.all`, simulating two open tabs both clicking "Open 6" at
    once). Both succeeded; the two responses' claimed counts summed to
    exactly 10 (not 12, not fewer — nothing lost or double-counted); all 10
    lootbox rows ended up `opened_at`-stamped exactly once each; the
    account gained exactly 10 new `pokemon_instances` rows total (not 10
    each); and the two responses' returned Pokémon ids were confirmed
    disjoint — no lootbox was ever claimed by both requests.
- Not independently verified via a real browser (no browser automation
  tool available in this environment): the quantity stepper's `-`/`+`/
  number-input UI, the queued reveal dialog actually walking through
  multiple boxes in sequence with "➡️ Next" on all but the last, and
  mid-queue skip behavior not bleeding into the next box's animation. The
  underlying data each of these renders from was confirmed live above (real
  batch-claimed lootboxes, real rolled Pokémon, in the exact order/count
  the server returned); the reveal queue's remount-per-box mechanism
  (`key={revealQueue[0].id}`) was reviewed by hand — same category of gap
  flagged in every prior step's validation notes.
