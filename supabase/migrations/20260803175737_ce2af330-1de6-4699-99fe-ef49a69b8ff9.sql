CREATE SCHEMA IF NOT EXISTS private;

ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;
ALTER FUNCTION public.is_trainer_or_admin(uuid) SET SCHEMA private;
ALTER FUNCTION public.assign_player_role_on_profile() SET SCHEMA private;

GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_trainer_or_admin(uuid) TO authenticated, service_role;