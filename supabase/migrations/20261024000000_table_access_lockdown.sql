-- Security fix: no direct table access for browser roles.
--
-- The app's only path to its tables is the Route Handlers, which use the
-- secret (service_role) key and enforce auth and ownership in code (see
-- lib/supabase/serverClient.ts). The browser holds the publishable key only
-- for Auth and Realtime. But several earlier migrations granted
-- insert/update/delete to `authenticated`, with matching "manage your own
-- rows" policies, described as defense-in-depth. With the publishable key
-- and their own session, any player could call PostgREST directly and skip
-- every API check: mint pokemon_instances with any stats, insert lootboxes,
-- insert match_results to fake leaderboard wins, insert an already
-- 'accepted' friendship with anyone, or bypass the display-name rules.
--
-- Fix: browser roles get no privileges on any table in `public`, and the
-- per-user policies are dropped so nothing suggests they're in use. RLS
-- stays enabled on every table, so even an accidental future grant is
-- deny-by-default until a policy is added on purpose. service_role bypasses
-- RLS and is unaffected.

do $$
declare
  t record;
  p record;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('revoke all on table public.%I from anon, authenticated', t.tablename);
    execute format('alter table public.%I enable row level security', t.tablename);
    for p in
      select policyname from pg_policies where schemaname = 'public' and tablename = t.tablename
    loop
      execute format('drop policy %I on public.%I', p.policyname, t.tablename);
    end loop;
  end loop;
end
$$;

revoke all on all sequences in schema public from anon, authenticated;

-- Tables and sequences created by later migrations (run as `postgres`)
-- don't pick up Supabase's default grants to the browser roles either.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;

-- Guard: fail this migration (and any re-run of it) if a browser role still
-- holds a privilege on a public table. supabase/tests/table_access.sql runs
-- the same check in CI after every migration.
do $$
declare
  leaked text;
begin
  select string_agg(distinct table_name || ':' || grantee || ':' || privilege_type, ', ')
    into leaked
    from information_schema.role_table_grants
   where table_schema = 'public'
     and grantee in ('anon', 'authenticated');
  if leaked is not null then
    raise exception 'browser roles still have table privileges: %', leaked;
  end if;
end
$$;
