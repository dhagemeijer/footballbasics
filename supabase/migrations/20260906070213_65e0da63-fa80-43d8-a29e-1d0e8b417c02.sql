
-- Move the privileged logic into the private schema
CREATE OR REPLACE FUNCTION private.get_player_signup_counts()
RETURNS TABLE(session_id uuid, player_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.session_id, count(*)::bigint
  FROM public.session_signups s
  WHERE auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = s.user_id AND r.role = 'player'
    )
  GROUP BY s.session_id
$$;

CREATE OR REPLACE FUNCTION private.get_session_option_votes(_session_id uuid)
RETURNS TABLE(option text, votes bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT o.opt, count(*)::bigint
  FROM public.training_focus_suggestions s
  CROSS JOIN LATERAL unnest(s.options) AS o(opt)
  WHERE s.session_id = _session_id
    AND (
      private.is_trainer_or_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.training_focus_suggestions m
        WHERE m.session_id = _session_id
          AND m.user_id = auth.uid()
          AND array_length(m.options, 1) > 0
      )
    )
  GROUP BY o.opt
  ORDER BY 2 DESC, 1
$$;

REVOKE ALL ON FUNCTION private.get_player_signup_counts() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.get_session_option_votes(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.get_player_signup_counts() TO service_role;
GRANT EXECUTE ON FUNCTION private.get_session_option_votes(uuid) TO service_role;

-- Public wrappers are SECURITY INVOKER, so signed-in users no longer
-- execute any SECURITY DEFINER function directly.
CREATE OR REPLACE FUNCTION public.get_player_signup_counts()
RETURNS TABLE(session_id uuid, player_count bigint)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path TO 'public'
AS $$ SELECT * FROM private.get_player_signup_counts() $$;

CREATE OR REPLACE FUNCTION public.get_session_option_votes(_session_id uuid)
RETURNS TABLE(option text, votes bigint)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path TO 'public'
AS $$ SELECT * FROM private.get_session_option_votes(_session_id) $$;

REVOKE ALL ON FUNCTION public.get_player_signup_counts() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_session_option_votes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_player_signup_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_session_option_votes(uuid) TO authenticated;
