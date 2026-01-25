-- Add is_completed column to training_sessions table
ALTER TABLE public.training_sessions 
ADD COLUMN is_completed boolean NOT NULL DEFAULT false;