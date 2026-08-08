# Step 14: Trade-up (burn 5 Pokémon for 1 lootbox)

## Why here

Depends on step 9 for the multi-select picker UI (shared
`PokemonInstanceCard`/`PokemonFilterBar`/`filterAndSortPokemon()` — trading
up out of a collection of hundreds needs the same search/filter/sort
already built for team picking and step 12's trade builder) and step 13
for the `pokemon_released_count` column this step increments.

## What changes

### The rule
Any 5 owned, non-starter Pokémon can be burned for exactly 1 lootbox.
Starters are excluded (they're fixed gear, not something to grind — same
reasoning `lib/shiny.ts` already uses to exempt them from shininess).

**This is additive, not a replacement.** Discard (`DELETE
/api/inventory/pokemon/[id]`) stays exactly as it is — trading up doesn't
require holding 5 unwanted Pokémon at once, and starters can still only be
released via discard, never trade-up. "Can replace the discard function"
(as raised) is read here as "can serve the same underlying purpose"
(getting rid of unwanted Pokémon), not "removes the discard button" — flag
this reading explicitly since it's a judgment call, easy to revisit if
the intent was actually to retire discard once this ships.

### Server
New Postgres function, atomicity matters here the same way it does for
step 12's `accept_trade` — a partial failure must never burn Pokémon
without granting the lootbox, or vice versa:
```sql
create or replace function trade_up_pokemon(p_user_id uuid, p_instance_ids uuid[])
returns uuid -- the new lootbox's id
language plpgsql
security definer set search_path = public
as $$
declare
  v_count int;
  v_lootbox_id uuid;
begin
  if array_length(p_instance_ids, 1) is distinct from 5 then
    raise exception 'Exactly 5 Pokemon are required';
  end if;

  select count(*) into v_count
  from pokemon_instances
  where id = any(p_instance_ids) and user_id = p_user_id and is_starter = false;

  if v_count is distinct from 5 then
    raise exception 'One or more Pokemon are not eligible (not owned, or a starter)';
  end if;

  delete from pokemon_instances where id = any(p_instance_ids);

  insert into lootboxes (user_id) values (p_user_id) returning id into v_lootbox_id;

  update profiles set pokemon_released_count = pokemon_released_count + 5
  where user_id = p_user_id;

  return v_lootbox_id;
end;
$$;
```
Re-validates ownership/starter-status *inside* the function against
`p_instance_ids` directly (never trusts a pre-check the client or Route
Handler already did) — same "re-validate at execution time" principle
`accept_trade` (step 12) uses, for the same reason: an inventory can change
between the client picking 5 and the request landing.

- `POST /api/inventory/tradeup` — body `{ pokemonInstanceIds: string[] }`.
  A cheap pre-check via the existing `getOwnedPokemonInstances()` helper
  (already used for 3v3 lock-in) gives a fast, specific error message
  before even calling the RPC; the RPC call itself is what actually
  enforces correctness. Returns `{ lootboxId }` on success.

### Client
- `InventoryPageClient.tsx` gains a "🔥 Trade Up" mode toggle. While
  active, the grid's card click behavior switches from "select for detail"
  to "toggle in trade-up basket" (reusing `PokemonInstanceCard`'s existing
  `selected`/`onSelect` props, just backed by a `Set<string>` capped at 5
  instead of a single `selectedId`) — starters render as
  non-selectable/dimmed in this mode, not hidden, so it's clear *why*
  they're unavailable rather than looking like a bug.
- A sticky bottom bar while in this mode: "X/5 selected" + a "Trade Up"
  button, disabled until exactly 5 are picked.
- Clicking "Trade Up" opens a confirmation `Modal` listing the 5 chosen
  Pokémon before committing — this is the one destructive, irreversible
  action in the app that doesn't already have a confirm step (today's
  single-Pokémon discard has none either), worth the extra click here
  specifically because 5 are lost at once, permanently, in exchange for an
  unknown result.
- On success: the 5 traded Pokémon disappear from local inventory state,
  the new lootbox is added to local lootbox state (immediately available
  to open, including through step 15's batch-open flow if that's shipped
  by then), mode exits back to normal.

## End state

- [ ] Selecting exactly 5 non-starter owned Pokémon and confirming grants
      exactly 1 new lootbox and permanently removes those 5 — verify all
      of this directly in Supabase, not just the UI.
- [ ] Starters can't be selected for trade-up in the UI, and a direct API
      call including a starter id is rejected server-side.
- [ ] Submitting fewer or more than 5 ids is rejected.
- [ ] Submitting an id you don't own (or that was already
      discarded/traded elsewhere between picking and confirming) is
      rejected with nothing partially applied — no Pokémon deleted, no
      lootbox granted.
- [ ] `profiles.pokemon_released_count` increases by exactly 5 per
      successful trade-up.
- [ ] Discard (`DELETE /api/inventory/pokemon/[id]`) still works exactly
      as before, unaffected by this step.
- [ ] `npm run build` / `npm run lint` clean.
