CREATE OR REPLACE FUNCTION private.get_player_signup_counts_machine()
RETURNS TABLE(session_id uuid, player_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.session_id, count(*)::bigint
  FROM public.session_signups s
  WHERE EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = s.user_id AND ur.role = 'player'
  )
  GROUP BY s.session_id
$$;

REVOKE ALL ON FUNCTION private.get_player_signup_counts_machine() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.get_player_signup_counts_machine() TO service_role;