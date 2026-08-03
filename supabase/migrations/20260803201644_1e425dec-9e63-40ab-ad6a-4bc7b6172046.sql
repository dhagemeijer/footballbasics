GRANT SELECT ON public.training_sessions TO anon;
CREATE POLICY "Sessions viewable by everyone" ON public.training_sessions FOR SELECT TO anon USING (true);
GRANT EXECUTE ON FUNCTION public.get_player_signup_counts() TO anon;