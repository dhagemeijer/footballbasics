CREATE OR REPLACE FUNCTION public.get_player_signup_counts()
RETURNS TABLE (session_id uuid, player_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.session_id, count(*)::bigint
  FROM public.session_signups s
  WHERE EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.user_id = s.user_id AND r.role = 'player'
  )
  GROUP BY s.session_id
$$;

REVOKE ALL ON FUNCTION public.get_player_signup_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_player_signup_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_signup_counts() TO anon;
GRANT EXECUTE ON FUNCTION public.get_player_signup_counts() TO service_role;