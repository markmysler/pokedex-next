# Step 50: Evolution — DB migration + `evolve_pokemon` RPC

**Status: shipped (code-complete, applied and validated locally; pending
deploy to production via push to `main` per this wave's own workflow).**
See `main.md`'s "Evolution, Psychic counterplay, and bilingual support"
section for the full context and dependency chain.

## Why here

The atomic write path, independent of step 49's pure-computation logic —
order between them doesn't matter, both just need step 48's `evolvesInto`
to exist conceptually (this step's SQL doesn't actually reference
`evolvesInto` itself; that lookup happens Route-Handler-side in step 51,
which passes the already-resolved target species number in).

## What changes

### New migration: `supabase/migrations/<timestamp>_pokemon_evolution.sql`

A near-direct structural copy of `trade_up_pokemon()`
(`supabase/migrations/20260808030000_pokemon_tradeup.sql`), same
"one Postgres function, not a sequence of Route-Handler-side calls" reason:
a partial failure must never burn the 5 without creating the evolved
instance, or vice versa.

```sql
create or replace function evolve_pokemon(
  p_user_id uuid,
  p_instance_ids uuid[],
  p_target_number text,
  p_stats jsonb, -- {hp, atk, def, spatk, spdef, spd, total} from step 49
  p_moves jsonb  -- the freshly-rolled moveset from step 49
)
returns uuid -- the new instance's id
language plpgsql
security definer set search_path = public
as $$
declare
  v_source_number text;
  v_count int;
  v_new_id uuid;
begin
  if array_length(p_instance_ids, 1) is distinct from 5 then
    raise exception 'Exactly 5 Pokemon are required';
  end if;

  -- Re-validates ownership/starter-status/species-match *inside* the
  -- function against p_instance_ids directly (never trusts a pre-check the
  -- client or Route Handler already did) -- same "re-validate at execution
  -- time" principle trade_up_pokemon and accept_trade already use.
  select pokemon_number into v_source_number
  from pokemon_instances
  where id = any(p_instance_ids) and user_id = p_user_id and is_starter = false
  limit 1;

  select count(*) into v_count
  from pokemon_instances
  where id = any(p_instance_ids)
    and user_id = p_user_id
    and is_starter = false
    and pokemon_number = v_source_number;

  if v_count is distinct from 5 then
    raise exception 'One or more Pokemon are not eligible (not owned, a starter, or not all the same species)';
  end if;

  delete from pokemon_instances where id = any(p_instance_ids);

  insert into pokemon_instances
    (user_id, pokemon_number, hp, atk, def, spatk, spdef, spd, total, moves, is_starter)
  values (
    p_user_id, p_target_number,
    (p_stats->>'hp')::int, (p_stats->>'atk')::int, (p_stats->>'def')::int,
    (p_stats->>'spatk')::int, (p_stats->>'spdef')::int, (p_stats->>'spd')::int,
    (p_stats->>'total')::int, p_moves, false
  )
  returning id into v_new_id;

  return v_new_id;
end;
$$;

grant execute on function public.evolve_pokemon(uuid, uuid[], text, jsonb, jsonb) to service_role;
```

Note the stats/moveset arrive as parameters computed by step 49's TS logic,
same division of labor `trade_up_pokemon` doesn't need (it just creates an
empty lootbox row — the roll happens later, at open time) but the starter
seed migration (`20260807020000_collection_system.sql`'s `handle_new_user`)
already establishes: SQL inserts pre-computed values, it doesn't compute
them itself. The species-match check (`v_source_number`) is new relative to
Trade Up, which doesn't care what species the 5 are — evolution does.

### What does NOT change in this step

- No computation of stats/moves happens in SQL — that's step 49's job,
  called Route-Handler-side (step 51) before this RPC runs.
- `trade_up_pokemon` itself is untouched — this is a new, separate function.

## End state

- [x] Migration file created following the timestamp-ordering convention
      every prior migration uses, with `evolve_pokemon(uuid, uuid[], text,
      jsonb, jsonb)` defined as above (or a close/justified variant decided
      during implementation).
- [x] Function re-validates ownership, non-starter status, and species-match
      against the actual rows, not a client-supplied assumption.
- [x] `grant execute ... to service_role` present (same grants-not-inherited
      caveat every other function in this schema notes) — **plus an
      explicit `revoke ... from public, anon, authenticated`, added after a
      real finding during local validation (see below).**
- [x] Per `main.md`'s "why this order" and the project's own migration
      workflow: this migration applies to production via the Supabase
      GitHub integration on push to `main`, not a locally-run CLI/DDL
      session — written and validated offline here, confirmed live only
      once actually pushed (same constraint `archive/v6/main.md` documented
      for step 44's trigger). Code-complete-pending-deploy is the expected
      end state for this step in isolation. Unlike step 44, this one *was*
      exercisable end-to-end pre-deploy against the local Supabase instance
      (this wave's whole reason for existing) — see below.
- [ ] Once deployed to production: a real dry-run (5 real owned non-starter
      instances of one species, on a test account) confirmed to delete the
      5 and create exactly 1 new instance of the right target species —
      gated behind an explicit user go-ahead before running against real
      data, same as every prior production-writing step. Not done yet:
      this migration hasn't been pushed to `main` (won't be until the whole
      wave is validated locally, per the workflow) — the equivalent dry run
      *has* already been done thoroughly against the local instance below.

## What actually happened

Implemented and validated end-to-end against the local Supabase instance on
`v7` (`supabase/migrations/20260918000000_pokemon_evolution.sql`), applied
via `npm run db:reset` (replays every migration from scratch, confirming no
conflict with the existing 20 migrations).

The function itself matches the planned SQL exactly (species-match check,
delete+insert, `returning id`).

### Real finding during validation: the `grant ... to service_role` pattern doesn't actually restrict access

Testing this function through the REST API (`POST /rest/v1/rpc/
evolve_pokemon`) with the public anon key — not just calling it directly in
`psql`, which would have missed this — showed the anon key could execute
it successfully and mutate real rows (deleted 5, created 1), despite the
function only ever granting `execute` to `service_role`.

Root cause, confirmed via `pg_proc.proacl`: **Supabase's local (and, since
these are the same base migrations, presumably hosted) setup grants
`EXECUTE` on every new `public`-schema function to `anon` and
`authenticated` by default**, as separate explicit ACL entries alongside
Postgres's own PUBLIC-execute default — neither is revoked by a
`grant ... to service_role` statement, which is additive, not exclusive.
`20260807000100_grants.sql`'s comment ("anon/authenticated intentionally
get nothing") describes the *intent* everywhere in this schema, but every
function using only that grant pattern — confirmed for `trade_up_pokemon`,
`accept_trade`, and `submit_move` via the same `information_schema.
routine_privileges` query — has actually been callable by anyone holding
the public anon key (which ships in every client bundle) this whole time,
bypassing all app-level auth by passing an arbitrary `p_user_id`.

**This function was fixed before shipping**: added
`revoke execute on function evolve_pokemon(...) from public, anon,
authenticated;` before the grant. Re-verified live: anon key now gets
`42501 permission denied for function evolve_pokemon`; service_role key
still succeeds; `pg_proc.proacl` now shows only `postgres`/`service_role`.

**The pre-existing gap in `trade_up_pokemon`/`accept_trade`/`submit_move`/
etc. is a live production security issue, out of this step's scope to fix
retroactively** (this step only owns the new function) — raised to the
user directly as its own priority item, separate from this wave, since it
affects the app right now regardless of whether this wave ships.

### Full validation performed (local instance)

- Happy path: seeded 5 real non-starter same-species instances (Pikachu)
  for a freshly-signed-up test account, called `evolve_pokemon` — deleted
  exactly the 5, created exactly 1 new instance of the target species
  (Raichu) with the passed-in stats/moveset, starters and other species
  untouched.
- Guard: wrong array length (4 ids) → rejected.
- Guard: mixed species (4 Pikachu + 1 Eevee) → rejected, nothing deleted.
- Guard: starter included → rejected, nothing deleted.
- Guard: an unowned/nonexistent id → rejected, nothing deleted.
- Confirmed atomicity: every rejected call left the full original row set
  intact (no partial delete before the exception).
- Confirmed via REST API (not just direct `psql`) with both the anon key
  (rejected, post-fix) and the service_role/secret key (succeeds) — the
  same access path the real `/api/inventory/evolve` Route Handler (step 51)
  will use.
- `npm run lint` / `npm run build` clean.
