DROP POLICY IF EXISTS "Users can signup for sessions" ON public.session_signups;
CREATE POLICY "Users or staff can signup for sessions"
ON public.session_signups
FOR INSERT
TO authenticated
WITH CHECK ((auth.uid() = user_id) OR private.is_trainer_or_admin(auth.uid()));