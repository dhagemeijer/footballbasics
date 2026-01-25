-- Create role enum
CREATE TYPE public.app_role AS ENUM ('player', 'trainer', 'admin');

-- Create profiles table (main user table linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  avatar_id INTEGER DEFAULT 1 CHECK (avatar_id >= 1 AND avatar_id <= 20),
  is_admin BOOLEAN DEFAULT FALSE,
  sessions_attended INTEGER DEFAULT 0,
  crossbars_hit INTEGER DEFAULT 0,
  running_speed DECIMAL(5,2) DEFAULT 0,
  shooting_speed DECIMAL(5,2) DEFAULT 0,
  session_quota INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table (for role-based access)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create training sessions table
CREATE TABLE public.training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  session_date DATE NOT NULL,
  session_time TIME NOT NULL,
  max_participants INTEGER DEFAULT 20,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create session signups table
CREATE TABLE public.session_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.training_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  signed_up_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  attended BOOLEAN DEFAULT FALSE,
  crossbars_hit INTEGER DEFAULT 0,
  running_speed DECIMAL(5,2),
  shooting_speed DECIMAL(5,2),
  UNIQUE (session_id, user_id)
);

-- Create session comments table
CREATE TABLE public.session_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.training_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create training focus suggestions table
CREATE TABLE public.training_focus_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  suggestion TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_broadcast BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_focus_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Check if user is trainer or admin
CREATE OR REPLACE FUNCTION public.is_trainer_or_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('trainer', 'admin')
  ) OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND is_admin = TRUE
  )
$$;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
FOR SELECT USING (TRUE);

CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id OR public.is_trainer_or_admin(auth.uid()));

CREATE POLICY "Admins can delete profiles" ON public.profiles
FOR DELETE USING (public.is_trainer_or_admin(auth.uid()));

-- User roles policies
CREATE POLICY "Roles viewable by trainers and admins" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id OR public.is_trainer_or_admin(auth.uid()));

CREATE POLICY "Only admins can manage roles" ON public.user_roles
FOR ALL USING (public.is_trainer_or_admin(auth.uid()));

-- Training sessions policies
CREATE POLICY "Sessions viewable by everyone" ON public.training_sessions
FOR SELECT USING (TRUE);

CREATE POLICY "Trainers and admins can create sessions" ON public.training_sessions
FOR INSERT WITH CHECK (public.is_trainer_or_admin(auth.uid()));

CREATE POLICY "Trainers and admins can update sessions" ON public.training_sessions
FOR UPDATE USING (public.is_trainer_or_admin(auth.uid()));

CREATE POLICY "Trainers and admins can delete sessions" ON public.training_sessions
FOR DELETE USING (public.is_trainer_or_admin(auth.uid()));

-- Session signups policies
CREATE POLICY "Signups viewable by participant or staff" ON public.session_signups
FOR SELECT USING (auth.uid() = user_id OR public.is_trainer_or_admin(auth.uid()));

CREATE POLICY "Users can signup for sessions" ON public.session_signups
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel own signup or staff can update" ON public.session_signups
FOR UPDATE USING (auth.uid() = user_id OR public.is_trainer_or_admin(auth.uid()));

CREATE POLICY "Users can delete own signup or admins" ON public.session_signups
FOR DELETE USING (auth.uid() = user_id OR public.is_trainer_or_admin(auth.uid()));

-- Session comments policies
CREATE POLICY "Comments viewable by everyone" ON public.session_comments
FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can comment" ON public.session_comments
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" ON public.session_comments
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any comment" ON public.session_comments
FOR DELETE USING (auth.uid() = user_id OR public.is_trainer_or_admin(auth.uid()));

-- Training focus suggestions policies
CREATE POLICY "Suggestions viewable by everyone" ON public.training_focus_suggestions
FOR SELECT USING (TRUE);

CREATE POLICY "Users can add suggestions" ON public.training_focus_suggestions
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own suggestions" ON public.training_focus_suggestions
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete suggestions" ON public.training_focus_suggestions
FOR DELETE USING (public.is_trainer_or_admin(auth.uid()));

-- Notifications policies
CREATE POLICY "Users can view own or broadcast notifications" ON public.notifications
FOR SELECT USING (auth.uid() = user_id OR is_broadcast = TRUE);

CREATE POLICY "Admins can create notifications" ON public.notifications
FOR INSERT WITH CHECK (public.is_trainer_or_admin(auth.uid()));

CREATE POLICY "Users can update own notification read status" ON public.notifications
FOR UPDATE USING (auth.uid() = user_id OR public.is_trainer_or_admin(auth.uid()));

CREATE POLICY "Admins can delete notifications" ON public.notifications
FOR DELETE USING (public.is_trainer_or_admin(auth.uid()));