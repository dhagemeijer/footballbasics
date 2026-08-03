CREATE OR REPLACE FUNCTION public.get_player_signup_counts()
 RETURNS TABLE(session_id uuid, player_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.session_id, count(*)::bigint
  FROM public.session_signups s
  WHERE auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = s.user_id AND r.role = 'player'
    )
  GROUP BY s.session_id
$function$;

REVOKE ALL ON FUNCTION public.get_player_signup_counts() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_session_option_votes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_player_signup_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_session_option_votes(uuid) TO authenticated;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_trainer_or_admin(uuid) FROM PUBLIC, anon;