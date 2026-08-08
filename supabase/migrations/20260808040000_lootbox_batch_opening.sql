-- Step 15 of the upgrade path (see pokedex-next/upgrades/15-lootbox-batch-opening.md):
-- claim up to p_count unopened lootboxes atomically in one statement, same
-- "UPDATE ... WHERE opened_at IS NULL RETURNING" shape the existing
-- single-open route already uses, generalized to a batch. FOR UPDATE SKIP
-- LOCKED means two concurrent batch-open requests (e.g. two tabs) can never
-- both claim the same row -- whichever gets there first locks it, the other
-- skips it and claims from what's left.
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

-- Called only from POST /api/inventory/lootboxes/open-many with the secret
-- key -- same grants-not-inherited caveat as every other function in this
-- schema.
grant execute on function public.claim_lootboxes(uuid, int) to service_role;
