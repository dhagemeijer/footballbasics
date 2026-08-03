DROP POLICY IF EXISTS "Sessions viewable by everyone" ON public.training_sessions;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE USAGE ON SCHEMA public FROM anon;

REVOKE ALL ON FUNCTION public.get_player_signup_counts() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_player_signup_counts() TO authenticated, service_role;