-- Add last_login_at column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN last_login_at timestamp with time zone;