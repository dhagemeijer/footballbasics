DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation ON public.profiles;
DROP FUNCTION IF EXISTS private.prevent_profile_privilege_escalation();
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_admin;