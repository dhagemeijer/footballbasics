CREATE OR REPLACE FUNCTION private.sync_profile_stats_from_signups()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user uuid;
  total_crossbars integer;
BEGIN
  target_user := COALESCE(NEW.user_id, OLD.user_id);

  SELECT COALESCE(SUM(COALESCE(crossbars_hit, 0)), 0)
    INTO total_crossbars
  FROM public.session_signups
  WHERE user_id = target_user;

  UPDATE public.profiles p
  SET crossbars_hit = total_crossbars,
      shooting_speed = CASE
        WHEN NEW.shooting_speed IS NULL THEN p.shooting_speed
        WHEN p.shooting_speed IS NULL OR NEW.shooting_speed > p.shooting_speed THEN NEW.shooting_speed
        ELSE p.shooting_speed
      END,
      running_speed = CASE
        WHEN NEW.running_speed IS NULL THEN p.running_speed
        WHEN p.running_speed IS NULL OR NEW.running_speed > p.running_speed THEN NEW.running_speed
        ELSE p.running_speed
      END
  WHERE p.user_id = target_user;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_profile_stats ON public.session_signups;
CREATE TRIGGER sync_profile_stats
AFTER INSERT OR UPDATE OF crossbars_hit, shooting_speed, running_speed ON public.session_signups
FOR EACH ROW EXECUTE FUNCTION private.sync_profile_stats_from_signups();

CREATE OR REPLACE FUNCTION private.sync_profile_stats_on_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_crossbars integer;
BEGIN
  SELECT COALESCE(SUM(COALESCE(crossbars_hit, 0)), 0)
    INTO total_crossbars
  FROM public.session_signups
  WHERE user_id = OLD.user_id;

  UPDATE public.profiles
  SET crossbars_hit = total_crossbars
  WHERE user_id = OLD.user_id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS sync_profile_stats_delete ON public.session_signups;
CREATE TRIGGER sync_profile_stats_delete
AFTER DELETE ON public.session_signups
FOR EACH ROW EXECUTE FUNCTION private.sync_profile_stats_on_delete();