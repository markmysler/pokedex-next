-- upgrades/44-starter-moveset-rework.md: brings starter movesets in line
-- with the mana-to-uses migration (upgrades/40-uses-based-move-data-model
-- .md's mana_cost -> max_uses rework, upgrades/41-move-slot-rebalance-3
-- -damage-1-support.md's 2-damage+2-support -> 3-damage+1-support balance
-- patch). Starters are hand-authored SQL, not rollMoveset() output, so
-- this migration hand-picks their new kits the same way the original 4
-- damage moves were hand-picked -- not a generic rollMoveset() backfill
-- (that's step 46's job, for every non-starter instance).
--
-- Per starter, the weakest of the original 4 damage moves' *surviving*
-- three (by power) becomes the guaranteed-free attack at battle time
-- (upgrades/40's dynamic per-instance override -- no catalog field marks
-- this explicitly, buildFighterState() computes it), the other of the
-- original 4 is dropped, and one type-flavored support move (hand-picked
-- from lib/data/movePool.ts's existing pools, same max_uses values that
-- pool already carries post-step-40/41) fills the new 4th slot:
--
--   Charmander (004): keep Scratch/Flamethrower/Fire Blast, drop Ember
--     (tied-lowest power with Scratch; Scratch kept as the first-listed of
--     the tie, same tie-break rule buildFighterState() itself uses), add
--     Inferno Curse (Fire debuff -- the only Fire-typed support move in
--     the whole pool, a clean type match).
--   Squirtle (007): keep Tackle/Bubble Beam/Hydro Pump, drop Water Gun
--     (tied-lowest power with Tackle, same tie-break). Add Barrier
--     (Psychic shield) -- the support pool has no Water-typed move at all
--     (a pre-existing pool-depth gap, same shallow-pool characteristic
--     upgrades/41's own file documents for several damage types), so this
--     is the closest defensively-flavored fallback rather than a type
--     match.
--   Bulbasaur (001): keep Tackle/Razor Leaf/Solar Beam, drop Vine Whip
--     (uniquely lowest power isn't Vine Whip here -- Tackle at 40 is
--     lower than Vine Whip's 45, so Tackle is the free move and Vine Whip
--     is the one cut). Add Cotton Guard (Grass def buff) -- Giga Drain is
--     also Grass-typed and available, but Cotton Guard was chosen to add
--     genuine kit variety (a non-damage effect) rather than a second
--     damage-dealing move that happens to sit in the support pool.
--
-- max_uses values are copied directly from each move's current catalog
-- entry (lib/data/pokedex.json for the damage moves, lib/data/movePool.ts
-- for the support moves) -- the same tier-derived values every other
-- instance of these moves already carries, no starter-specific rescaling.

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
        {"name":"Scratch","type":"Normal","power":40,"category":"Physical","max_uses":5,"kind":"damage"},
        {"name":"Flamethrower","type":"Fire","power":90,"category":"Special","max_uses":2,"kind":"damage"},
        {"name":"Fire Blast","type":"Fire","power":110,"category":"Special","max_uses":2,"kind":"damage"},
        {"name":"Inferno Curse","type":"Fire","max_uses":2,"kind":"debuff","debuff":{"effect":"inflictStatus","status":"burn"}}
      ]'::jsonb,
     true),
    (new.id, '007', 44, 48, 65, 50, 64, 43, 314,
     '[
        {"name":"Tackle","type":"Normal","power":40,"category":"Physical","max_uses":5,"kind":"damage"},
        {"name":"Bubble Beam","type":"Water","power":65,"category":"Special","max_uses":4,"kind":"damage"},
        {"name":"Hydro Pump","type":"Water","power":110,"category":"Special","max_uses":2,"kind":"damage"},
        {"name":"Barrier","type":"Psychic","max_uses":3,"kind":"buff","buff":{"effect":"shield","amount":60}}
      ]'::jsonb,
     true),
    (new.id, '001', 45, 49, 49, 65, 65, 45, 318,
     '[
        {"name":"Tackle","type":"Normal","power":40,"category":"Physical","max_uses":5,"kind":"damage"},
        {"name":"Razor Leaf","type":"Grass","power":55,"category":"Physical","max_uses":5,"kind":"damage"},
        {"name":"Solar Beam","type":"Grass","power":120,"category":"Special","max_uses":1,"kind":"damage"},
        {"name":"Cotton Guard","type":"Grass","max_uses":2,"kind":"buff","buff":{"effect":"statUp","stat":"def","multiplier":1.5,"turns":3}}
      ]'::jsonb,
     true);

  insert into public.lootboxes (user_id) values (new.id);

  return new;
end;
$$;

-- Backfill: every already-granted starter (is_starter = true) gets the
-- exact same new kit as its species above -- unconditional per-species
-- replacement (not a "missing field" guard like
-- 20260814000000_starter_move_kind_fix.sql's, since every pre-migration
-- starter moveset is uniformly the old 4-damage shape regardless of
-- whether it already has "kind" tags). Naturally idempotent: re-running
-- this UPDATE a second time writes the identical jsonb again, a no-op in
-- effect.
update pokemon_instances
set moves = case pokemon_number
  when '004' then '[
    {"name":"Scratch","type":"Normal","power":40,"category":"Physical","max_uses":5,"kind":"damage"},
    {"name":"Flamethrower","type":"Fire","power":90,"category":"Special","max_uses":2,"kind":"damage"},
    {"name":"Fire Blast","type":"Fire","power":110,"category":"Special","max_uses":2,"kind":"damage"},
    {"name":"Inferno Curse","type":"Fire","max_uses":2,"kind":"debuff","debuff":{"effect":"inflictStatus","status":"burn"}}
  ]'::jsonb
  when '007' then '[
    {"name":"Tackle","type":"Normal","power":40,"category":"Physical","max_uses":5,"kind":"damage"},
    {"name":"Bubble Beam","type":"Water","power":65,"category":"Special","max_uses":4,"kind":"damage"},
    {"name":"Hydro Pump","type":"Water","power":110,"category":"Special","max_uses":2,"kind":"damage"},
    {"name":"Barrier","type":"Psychic","max_uses":3,"kind":"buff","buff":{"effect":"shield","amount":60}}
  ]'::jsonb
  when '001' then '[
    {"name":"Tackle","type":"Normal","power":40,"category":"Physical","max_uses":5,"kind":"damage"},
    {"name":"Razor Leaf","type":"Grass","power":55,"category":"Physical","max_uses":5,"kind":"damage"},
    {"name":"Solar Beam","type":"Grass","power":120,"category":"Special","max_uses":1,"kind":"damage"},
    {"name":"Cotton Guard","type":"Grass","max_uses":2,"kind":"buff","buff":{"effect":"statUp","stat":"def","multiplier":1.5,"turns":3}}
  ]'::jsonb
  else moves
end
where is_starter = true
  and pokemon_number in ('001', '004', '007');
