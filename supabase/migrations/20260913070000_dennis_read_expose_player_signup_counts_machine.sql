-- Public wrapper for private.get_player_signup_counts_machine(),
-- required because PostgREST (and therefore supabase-js's .rpc())
-- only resolves functions within its exposed API schema(s) — this
-- project's default is "public" only (no [api] schema override exists
-- in supabase/config.toml). A SQL-level GRANT EXECUTE on a
-- private-schema function does not make it reachable through the API
-- by itself.
--
-- Mirrors the exact pattern already used for public.get_player_signup_counts()
-- (see migration 20260906070213): a thin SECURITY INVOKER wrapper that
-- delegates to the private-schema implementation, which continues to
-- do the actual player-only counting. Access stays restricted to
-- service_role only — anon and authenticated are explicitly revoked,
-- matching private.get_player_signup_counts_machine()'s own grants.
CREATE OR REPLACE FUNCTION public.get_player_signup_counts_machine()
RETURNS TABLE(session_id uuid, player_count bigint)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path TO 'public'
AS $$ SELECT * FROM private.get_player_signup_counts_machine() $$;

REVOKE ALL ON FUNCTION public.get_player_signup_counts_machine() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_signup_counts_machine() TO service_role;
