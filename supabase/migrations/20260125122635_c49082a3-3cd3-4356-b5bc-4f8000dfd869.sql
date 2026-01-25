-- Add location column to training_sessions table
ALTER TABLE public.training_sessions 
ADD COLUMN location text DEFAULT 'Forum Sport';