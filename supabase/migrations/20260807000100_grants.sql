-- Tables/functions created via migration (SQL Editor/CLI/GitHub integration)
-- don't automatically inherit the default grants that dashboard-created
-- tables get, so service_role hits "permission denied" despite RLS being
-- configured correctly. Grant only to service_role — anon/authenticated
-- intentionally get nothing, matching the RLS-with-no-policies design in
-- 20260807000000_init_schema.sql (server-side Route Handlers, using the
-- secret key, are the only path to these tables).
grant usage on schema public to service_role;

grant all on table public.user_pokedex to service_role;
grant all on table public.battle_rooms to service_role;

grant execute on function public.submit_move(text, int, jsonb) to service_role;
grant execute on function public.finalize_round(text, jsonb) to service_role;
