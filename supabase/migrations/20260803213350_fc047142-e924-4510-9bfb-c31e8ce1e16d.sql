ALTER TABLE public.training_focus_suggestions
  ADD COLUMN IF NOT EXISTS options text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.training_focus_suggestions
  DROP CONSTRAINT IF EXISTS training_focus_suggestions_options_valid;

ALTER TABLE public.training_focus_suggestions
  ADD CONSTRAINT training_focus_suggestions_options_valid
  CHECK (options <@ ARRAY['Aanvallen','Verdedigen','Scoren','Passen','Dribbelen','Positiespel']::text[]);

ALTER TABLE public.training_focus_suggestions
  ALTER COLUMN suggestion DROP NOT NULL,
  ALTER COLUMN suggestion SET DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS training_focus_suggestions_user_session_uidx
  ON public.training_focus_suggestions (user_id, session_id)
  WHERE session_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_session_option_votes(_session_id uuid)
RETURNS TABLE(option text, votes bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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

REVOKE ALL ON FUNCTION public.get_session_option_votes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_session_option_votes(uuid) TO authenticated;