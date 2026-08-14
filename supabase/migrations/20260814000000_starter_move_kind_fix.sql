-- Fixes a bug discovered validating upgrades/28-move-ui-and-ally-targeting.md
-- against the live deployment: handle_new_user() (most recently redefined in
-- 20260808060000_signup_lootbox.sql) hardcodes each starter's 4 moves as raw
-- JSON predating upgrades/21-move-kind-data-model.md's discriminated union --
-- none of them carry the "kind" field lib/battleEngine.ts's executeMove() has
-- branched on since step 21. A move with no `kind` falls through every check
-- in that branch and hits the final case (redirect), so a starter's attack
-- silently deals 0 damage and logs a nonsensical "confused for undefined
-- turns" line instead of actually attacking. Every starter Pokemon on every
-- account -- past and future -- is affected.
--
-- All 12 hardcoded starter moves are plain damage moves by construction
-- (this trigger has never granted anything else), so the fix is the same
-- mechanical "kind": "damage" tag step 21 added to lib/data/pokedex.json's
-- moves, applied here in both places it's needed: the trigger definition
-- (for signups going forward) and a one-time backfill (for every starter
-- already granted under the old definition).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_friend_code text;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  attempt int := 0;
begin
  loop
    new_friend_code := '';
    for i in 1..6 loop
      new_friend_code := new_friend_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    attempt := attempt + 1;
    exit when not exists (select 1 from profiles where friend_code = new_friend_code) or attempt >= 10;
  end loop;

  insert into public.profiles (user_id, display_name, friend_code)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1)),
    new_friend_code
  );

  insert into public.pokemon_instances
    (user_id, pokemon_number, hp, atk, def, spatk, spdef, spd, total, moves, is_starter)
  values
    (new.id, '004', 39, 52, 43, 60, 50, 65, 309,
     '[
        {"name":"Scratch","type":"Normal","power":40,"category":"Physical","mana_cost":10,"kind":"damage"},
        {"name":"Ember","type":"Fire","power":40,"category":"Special","mana_cost":10,"kind":"damage"},
        {"name":"Flamethrower","type":"Fire","power":90,"category":"Special","mana_cost":30,"kind":"damage"},
        {"name":"Fire Blast","type":"Fire","power":110,"category":"Special","mana_cost":30,"kind":"damage"}
      ]'::jsonb,
     true),
    (new.id, '007', 44, 48, 65, 50, 64, 43, 314,
     '[
        {"name":"Tackle","type":"Normal","power":40,"category":"Physical","mana_cost":10,"kind":"damage"},
        {"name":"Water Gun","type":"Water","power":40,"category":"Special","mana_cost":10,"kind":"damage"},
        {"name":"Bubble Beam","type":"Water","power":65,"category":"Special","mana_cost":20,"kind":"damage"},
        {"name":"Hydro Pump","type":"Water","power":110,"category":"Special","mana_cost":30,"kind":"damage"}
      ]'::jsonb,
     true),
    (new.id, '001', 45, 49, 49, 65, 65, 45, 318,
     '[
        {"name":"Tackle","type":"Normal","power":40,"category":"Physical","mana_cost":10,"kind":"damage"},
        {"name":"Vine Whip","type":"Grass","power":45,"category":"Physical","mana_cost":10,"kind":"damage"},
        {"name":"Razor Leaf","type":"Grass","power":55,"category":"Physical","mana_cost":10,"kind":"damage"},
        {"name":"Solar Beam","type":"Grass","power":120,"category":"Special","mana_cost":45,"kind":"damage"}
      ]'::jsonb,
     true);

  insert into public.lootboxes (user_id) values (new.id);

  return new;
end;
$$;

-- Backfill: add "kind": "damage" to any already-granted starter's move
-- entries that don't already have it. Scoped to is_starter = true (the only
-- rows this trigger has ever written) and to move elements actually missing
-- the field, so a starter instance re-run against this migration a second
-- time -- or one that already happens to be correctly tagged -- is a no-op.
update pokemon_instances
set moves = (
  select jsonb_agg(
    case when move ? 'kind' then move else move || jsonb_build_object('kind', 'damage') end
  )
  from jsonb_array_elements(moves) as move
)
where is_starter = true
  and exists (
    select 1 from jsonb_array_elements(moves) as move2 where not (move2 ? 'kind')
  );
