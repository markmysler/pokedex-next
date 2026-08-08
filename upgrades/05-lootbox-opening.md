# Step 5: Lootbox opening experience (card-pack reveal)

## Why here

Depends on step 1 (shadcn + `tailwindcss-animate` for the reveal
animation), step 3 (the battle result dialog's "Open it now" CTA hooks
into this), and step 4 (the reveal needs to know shiny status to make the
big moment actually mean something). Today, opening a lootbox
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
A shadcn `Dialog` (full-bleed / large) sequencing through:
1. **Drumroll** — a short (~1–1.5s) suspense beat: a pulsing/shaking
   lootbox icon or similar, using `tailwindcss-animate` keyframes. The
   `POST` request already completed before this dialog opens (its response
   is what the rest of the sequence reveals) — this beat is a fixed
   client-side delay, not a loading state.
2. **Sprite reveal** — the rolled Pokémon's sprite scales/fades in
   (correctly shiny per step 4's `isShinyInstance()`), with its name,
   number, and type badges appearing alongside.
3. **Stats fill one-by-one** — each of the 6 stat bars (shadcn `Progress`,
   same HP/Atk/Def/SpAtk/SpDef/Speed order as `PokemonDetail.tsx`) animates
   from 0 up to its rolled value in sequence, not all at once: reveal stat
   `i` at roughly `i * 350–400ms`, each bar's own fill using a CSS
   transition on `Progress`'s value rather than a hand-rolled timer per
   bar.
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
- **Battle result dialog (step 3)**: when a lootbox was earned, its "Open
  it now" button opens this same dialog directly from the post-battle
  screen instead of sending the player to Inventory first.
- **Multiple unopened lootboxes**: after one reveal finishes, return to
  the normal inventory/lootbox-list view (showing however many are left)
  rather than auto-chaining into the next one — keeps each opening feeling
  like its own moment instead of a rapid-fire queue. Default assumption,
  easy to revisit if it feels tedious once built.

## End state

- [ ] Opening a lootbox launches the reveal dialog instead of the Pokémon
      just appearing in the inventory list.
- [ ] The sequence plays in order: drumroll → sprite reveal (correctly
      shiny when it qualifies) → stats filling one at a time → moveset.
- [ ] A skip control immediately shows the fully-revealed state.
- [ ] The newly opened Pokémon appears in Inventory (grid, list, and
      detail panel) immediately after the dialog closes, with correct
      stats/moves/shiny status and no page reload.
- [ ] Confirm via network inspection that the Pokémon the reveal shows is
      exactly what `POST /api/inventory/lootboxes/[id]/open` returned —
      the animation never re-rolls or alters the result.
- [ ] The battle result dialog's "Open it now" CTA (once step 3 is wired
      up to it) opens this same dialog directly.
- [ ] `npm run build` / `npm run lint` clean.
