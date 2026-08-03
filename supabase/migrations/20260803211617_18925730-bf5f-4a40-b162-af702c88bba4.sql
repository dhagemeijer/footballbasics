ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS related_id uuid;

CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON public.notifications (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION private.admin_notify_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.profiles WHERE lower(username) = 'dennis' LIMIT 1
$$;

CREATE OR REPLACE FUNCTION private.notify_new_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE admin_id uuid;
BEGIN
  admin_id := private.admin_notify_user_id();
  IF admin_id IS NULL OR admin_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.notifications (user_id, title, message, type, related_id)
  VALUES (
    admin_id,
    'Nieuwe speler: ' || NEW.first_name,
    NEW.first_name || ' (@' || NEW.username || ') heeft een account aangemaakt.',
    'new_player',
    NEW.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_notify_admin ON public.profiles;
CREATE TRIGGER on_profile_created_notify_admin
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION private.notify_new_profile();

CREATE OR REPLACE FUNCTION private.notify_session_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid;
  person_name text;
  person_role text;
  s RECORD;
BEGIN
  admin_id := private.admin_notify_user_id();
  IF admin_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT first_name INTO person_name FROM public.profiles WHERE user_id = NEW.user_id LIMIT 1;
  SELECT CASE
           WHEN bool_or(role = 'admin') THEN 'admin'
           WHEN bool_or(role = 'trainer') THEN 'trainer'
           ELSE 'speler'
         END
    INTO person_role
  FROM public.user_roles WHERE user_id = NEW.user_id;

  SELECT title, session_date, session_time INTO s
  FROM public.training_sessions WHERE id = NEW.session_id;

  INSERT INTO public.notifications (user_id, title, message, type, related_id)
  VALUES (
    admin_id,
    coalesce(person_name, 'Iemand') || ' (' || coalesce(person_role, 'speler') || ') heeft zich aangemeld voor ' || coalesce(s.title, 'een training'),
    coalesce(s.title, 'Training') || ' op ' || coalesce(to_char(s.session_date, 'DD-MM-YYYY'), '?') || ' om ' || coalesce(to_char(s.session_time, 'HH24:MI'), '?'),
    'session_signup',
    NEW.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_signup_notify_admin ON public.session_signups;
CREATE TRIGGER on_signup_notify_admin
AFTER INSERT ON public.session_signups
FOR EACH ROW EXECUTE FUNCTION private.notify_session_signup();

CREATE OR REPLACE FUNCTION private.notify_new_suggestion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid;
  person_name text;
BEGIN
  admin_id := private.admin_notify_user_id();
  IF admin_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT first_name INTO person_name FROM public.profiles WHERE user_id = NEW.user_id LIMIT 1;
  INSERT INTO public.notifications (user_id, title, message, type, related_id)
  VALUES (
    admin_id,
    'Nieuwe suggestie van ' || coalesce(person_name, 'speler'),
    NEW.suggestion,
    'suggestion',
    NEW.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_suggestion_notify_admin ON public.training_focus_suggestions;
CREATE TRIGGER on_suggestion_notify_admin
AFTER INSERT ON public.training_focus_suggestions
FOR EACH ROW EXECUTE FUNCTION private.notify_new_suggestion();