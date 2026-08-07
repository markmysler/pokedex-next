-- Step 2 of the upgrade path (see pokedex-next/upgrades/02-collection-system.md):
-- introduces owned Pokemon instances (rolled stats/moves per catch) and
-- lootboxes, and retires the old "acquired" manual toggle in favor of real
-- ownership.

create table pokemon_instances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pokemon_number text not null,
  hp int not null,
  atk int not null,
  def int not null,
  spatk int not null,
  spdef int not null,
  spd int not null,
  total int not null,
  moves jsonb not null,
  is_starter boolean not null default false,
  created_at timestamptz not null default now()
);

create index pokemon_instances_user_id_idx on pokemon_instances(user_id);

alter table pokemon_instances enable row level security;

-- Route Handlers (app/api/inventory/**) use the secret key server-side for
-- all access, same pattern as user_pokedex/battle_rooms. These policies are
-- defense-in-depth, not currently exercised directly by the app.
create policy "Users manage their own pokemon instances"
  on pokemon_instances for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table lootboxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opened_at timestamptz,
  created_at timestamptz not null default now()
);

create index lootboxes_user_id_idx on lootboxes(user_id);

alter table lootboxes enable row level security;

create policy "Users manage their own lootboxes"
  on lootboxes for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Extends the handle_new_user trigger from 01-auth.md so every signup gets a
-- profile row AND a 3-Pokemon starting team atomically, in one transaction.
-- Starters are guaranteed gear, not lootbox rewards, so their stats/moves
-- are fixed (not rolled) -- copied verbatim from lib/data/pokedex.json's
-- #001 Bulbasaur / #004 Charmander / #007 Squirtle entries at the time this
-- migration was written. If that source data changes later, this migration
-- is a historical snapshot and does not need to change retroactively.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1))
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

  return new;
end;
$$;

-- "Caught" is now derived from pokemon_instances (see app/api/user-data/route.ts)
-- instead of a stored toggle. notes stays -- per-species annotations are
-- independent of ownership.
alter table user_pokedex drop column if exists acquired;

grant all on table public.pokemon_instances to service_role;
grant select, insert, update, delete on table public.pokemon_instances to authenticated;

grant all on table public.lootboxes to service_role;
grant select, insert, update, delete on table public.lootboxes to authenticated;
