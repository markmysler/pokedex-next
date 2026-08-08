# Step 4: Lootbox opening experience (card-pack reveal)

## Why here

Depends on step 2 (the battle result dialog's "Open it now" CTA hooks into
this) and step 3 (the reveal needs to know shiny status to make the big
moment actually mean something). Today, opening a lootbox
(`POST /api/inventory/lootboxes/[id]/open`) is a single request that just
adds a card to the inventory grid — functionally complete since the
original plan's step 2, but not remotely a "moment."

## What changes

### The roll doesn't move — only the reveal does
`POST /api/inventory/lootboxes/[id]/open` already atomically claims the
lootbox and rolls+persists the Pokémon in one request (see the original
plan's step 2 — the "atomic claim" `UPDATE ... RETURNING` pattern). That
doesn't change. Everything in this step is about how the *already-decided*
result gets revealed client-side — the suspense is cosmetic, not a second
roll or a delayed server decision. Worth stating plainly in code comments
too, so it's never mistaken for a place to add "real" randomness.

### Client: `components/inventory/LootboxRevealDialog.tsx`
Built on `components/ui/Modal.tsx` (large/full-bleed variant), sequencing
through:
1. **Drumroll** — a short (~1–1.5s) suspense beat: a pulsing/shaking
   lootbox icon or similar, driven by a plain CSS `@keyframes` animation
   added to `app/globals.css` (same pattern as the app's existing CSS,
   no animation library). The `POST` request already completed before this
   dialog opens (its response is what the rest of the sequence reveals) —
   this beat is a fixed client-side delay, not a loading state.
2. **Sprite reveal** — the rolled Pokémon's sprite scales/fades in via a
   CSS transition (correctly shiny per step 3's `isShinyInstance()`), with
   its name, number, and type badges appearing alongside.
3. **Stats fill one-by-one** — each of the 6 stat bars (reusing the
   existing `.stat-bar-track`/`.stat-bar-fill` markup from
   `PokemonDetail.tsx`, same HP/Atk/Def/SpAtk/SpDef/Speed order) animates
   from 0 up to its rolled value in sequence, not all at once: reveal stat
   `i` at roughly `i * 350–400ms`, each bar's own fill using a CSS
   `transition: width` on `.stat-bar-fill` rather than a hand-rolled timer
   per bar.
4. **Moveset reveal** — after stats finish, the 4 rolled moves appear
   (matching `PokemonDetail.tsx`'s move-list styling).
- A **Skip** control (tap anywhere, or an explicit button) jumps straight
  to the fully-revealed end state — don't force everyone through the full
  animation every single time, especially useful while testing.
- On close, the newly opened Pokémon needs to already be reflected in
  Inventory's local state (grid/list/detail) with no reload — the reveal
  dialog receives the same response `InventoryPageClient.tsx` already gets
  from the open call today, so this is wiring, not a new fetch.

### Integration points
- **Inventory page**: the existing "open lootbox" action opens this dialog
  instead of silently adding the card.
- **Battle result dialog (step 2)**: when a lootbox was earned, its "Open
  it now" button opens this same dialog directly from the post-battle
  screen instead of sending the player to Inventory first.
- **Multiple unopened lootboxes**: after one reveal finishes, return to
  the normal inventory/lootbox-list view (showing however many are left)
  rather than auto-chaining into the next one — keeps each opening feeling
  like its own moment instead of a rapid-fire queue. Default assumption,
  easy to revisit if it feels tedious once built.

## End state

- [x] Opening a lootbox launches the reveal dialog instead of the Pokémon
      just appearing in the inventory list.
- [x] The sequence plays in order: drumroll → sprite reveal (correctly
      shiny when it qualifies) → stats filling one at a time → moveset.
- [x] A skip control immediately shows the fully-revealed state.
- [x] The newly opened Pokémon appears in Inventory (grid, list, and
      detail panel) immediately after the dialog closes, with correct
      stats/moves/shiny status and no page reload.
- [x] Confirm via network inspection that the Pokémon the reveal shows is
      exactly what `POST /api/inventory/lootboxes/[id]/open` returned —
      the animation never re-rolls or alters the result.
- [x] The battle result dialog's "Open it now" CTA (once step 2 is wired
      up to it) opens this same dialog directly.
- [x] `npm run build` / `npm run lint` clean.

### Validation notes (2026-08-07)

- `npm run build` and `npm run lint` both clean.
- `components/inventory/LootboxRevealDialog.tsx` is purely presentational —
  it takes an already-resolved `pokemon: OwnedPokemon` prop and makes no
  fetch calls of its own; the drumroll → sprite → stats (one bar every
  ~375ms via `STAT_STEP_MS`) → moves sequence is a local `phase` state
  machine driven by `setTimeout`s, with a `Skip` control (and "tap
  anywhere" while still animating) that jumps straight to the fully-revealed
  state. Built on `Modal` (`large` variant) with new CSS
  (`.lootbox-reveal*`) in `app/globals.css`, including a `@keyframes
  lootbox-shake` for the drumroll icon and a `.stat-bar-fill` transition
  scoped to `.lootbox-stats` only (so it doesn't change the Pokédex/
  Inventory detail panels' existing instant-snap stat bars elsewhere).
- **Inventory integration**: `InventoryPageClient.tsx`'s existing
  `handleOpen()` already fetches the result and updates local
  pokemon/lootbox state — the only change was also calling
  `setRevealPokemon(data.pokemon)` with that same response, exactly as the
  plan specifies ("wiring, not a new fetch").
- **Battle result dialog integration**: `POST /api/battles/bot-result` and
  the online `POST /api/rooms/[code]/move` (in `recordBattleEnd`) now both
  return the newly-inserted lootbox's id (`lootboxId`) alongside
  `lootboxGranted`. `BattleResultDialog` gained an optional `onOpenNow`
  prop — when the win response carried a real `lootboxId`, clicking "📦
  Open it now" calls the same `POST /api/inventory/lootboxes/[id]/open`
  endpoint the Inventory page uses, then swaps the result dialog for
  `LootboxRevealDialog` with that response. For online battles arriving via
  the poll backstop (which reads persisted `RoomState`, not the ephemeral
  round-result payload), `lootboxId` is simply absent — the button doesn't
  render in that fallback case rather than pointing at a stale/wrong id;
  the broadcast and the winning mover's own HTTP response (the two primary
  paths) both always carry it.
- Ran a temporary live validation (deleted after running) against a local
  dev server with disposable Supabase accounts:
  - Confirmed `POST /api/inventory/lootboxes/[id]/open`'s response still
    has every field the reveal dialog reads (`id`, `number`, `name`,
    `type1`, `type2`, all 6 stats, `total`, 4 `moves`, `isStarter`).
  - Confirmed `bot-result` returns a real `lootboxId` on a win where a
    lootbox was granted, and `null` on a loss.
  - Played a real two-account online 3v3 battle to completion purely
    through the actual API; the winning payload's `lootboxId` pointed at a
    real, still-unopened `lootboxes` row owned by the actual winner; then
    opened it through the exact same endpoint "Open it now" calls and
    confirmed a full Pokémon came back.
  - Confirmed `/inventory`, `/battle`, and `/online` all still render 200
    with no error boundary for both accounts afterward.
- Not verified (no browser automation tool available in this environment):
  actually watching the reveal animation play — the phase sequencing,
  CSS transitions, and skip behavior were reviewed by hand in the component
  code, not viewed in a browser.
