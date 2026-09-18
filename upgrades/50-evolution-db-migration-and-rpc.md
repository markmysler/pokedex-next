# Step 50: Evolution — DB migration + `evolve_pokemon` RPC

**Status: planned.** See `main.md`'s "Evolution, Psychic counterplay,
and bilingual support" section for the full context and dependency chain.

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

- [ ] Migration file created following the timestamp-ordering convention
      every prior migration uses, with `evolve_pokemon(uuid, uuid[], text,
      jsonb, jsonb)` defined as above (or a close/justified variant decided
      during implementation).
- [ ] Function re-validates ownership, non-starter status, and species-match
      against the actual rows, not a client-supplied assumption.
- [ ] `grant execute ... to service_role` present (same grants-not-inherited
      caveat every other function in this schema notes).
- [ ] Per `main.md`'s "why this order" and the project's own migration
      workflow: this migration applies to production via the Supabase
      GitHub integration on push to `main`, not a locally-run CLI/DDL
      session — written and validated offline here, confirmed live only
      once actually pushed (same constraint `archive/v6/main.md` documented
      for step 44's trigger). Code-complete-pending-deploy is the expected
      end state for this step in isolation.
- [ ] Once deployed: a real dry-run (5 real owned non-starter instances of
      one species, on a test account) confirmed to delete the 5 and create
      exactly 1 new instance of the right target species — gated behind an
      explicit user go-ahead before running against real data, same as
      every prior production-writing step.
