-- Restrict profiles reads
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by signed-in users"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- Restrict suggestions reads to owner or staff
DROP POLICY IF EXISTS "Suggestions viewable by everyone" ON public.training_focus_suggestions;
CREATE POLICY "Suggestions viewable by owner or staff"
ON public.training_focus_suggestions FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_trainer_or_admin(auth.uid()));

-- Restrict comments to session participants, comment owner, or staff
DROP POLICY IF EXISTS "Comments viewable by everyone" ON public.session_comments;
CREATE POLICY "Comments viewable by participants or staff"
ON public.session_comments FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_trainer_or_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.session_signups s
    WHERE s.session_id = session_comments.session_id AND s.user_id = auth.uid()
  )
);

-- Sessions: signed-in only
DROP POLICY IF EXISTS "Sessions viewable by everyone" ON public.training_sessions;
CREATE POLICY "Sessions viewable by signed-in users"
ON public.training_sessions FOR SELECT TO authenticated
USING (true);

-- Remove anonymous Data API / GraphQL exposure
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.session_comments FROM anon;
REVOKE ALL ON public.session_signups FROM anon;
REVOKE ALL ON public.training_focus_suggestions FROM anon;
REVOKE ALL ON public.training_sessions FROM anon;
REVOKE ALL ON public.notifications FROM anon;
REVOKE ALL ON public.user_roles FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_signups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_focus_suggestions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

-- Security definer functions should not be callable directly via the API
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.is_trainer_or_admin(uuid) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.assign_player_role_on_profile() FROM anon, authenticated, public;