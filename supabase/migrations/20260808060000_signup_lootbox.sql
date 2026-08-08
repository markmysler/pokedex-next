-- Extends handle_new_user() (most recently redefined in
-- 20260807060000_friend_system.sql) so every new signup also gets one
-- unopened lootbox, atomically with the profile/friend-code/starter rows in
-- the same trigger transaction -- same reasoning as the starters
-- themselves: guaranteed at signup, not a chance roll.
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
        {"name":"Scratch","type":"Normal","power":40,"category":"Physical","mana_cost":10},
        {"name":"Ember","type":"Fire","power":40,"category":"Special","mana_cost":10},
        {"name":"Flamethrower","type":"Fire","power":90,"category":"Special","mana_cost":30},
        {"name":"Fire Blast","type":"Fire","power":110,"category":"Special","mana_cost":30}
      ]'::jsonb,
     true),
    (new.id, '007', 44, 48, 65, 50, 64, 43, 314,
     '[
        {"name":"Tackle","type":"Normal","power":40,"category":"Physical","mana_cost":10},
        {"name":"Water Gun","type":"Water","power":40,"category":"Special","mana_cost":10},
        {"name":"Bubble Beam","type":"Water","power":65,"category":"Special","mana_cost":20},
        {"name":"Hydro Pump","type":"Water","power":110,"category":"Special","mana_cost":30}
      ]'::jsonb,
     true),
    (new.id, '001', 45, 49, 49, 65, 65, 45, 318,
     '[
        {"name":"Tackle","type":"Normal","power":40,"category":"Physical","mana_cost":10},
        {"name":"Vine Whip","type":"Grass","power":45,"category":"Physical","mana_cost":10},
        {"name":"Razor Leaf","type":"Grass","power":55,"category":"Physical","mana_cost":10},
        {"name":"Solar Beam","type":"Grass","power":120,"category":"Special","mana_cost":45}
      ]'::jsonb,
     true);

  insert into public.lootboxes (user_id) values (new.id);

  return new;
end;
$$;
