-- Add session_id and status columns to training_focus_suggestions
ALTER TABLE public.training_focus_suggestions 
ADD COLUMN session_id uuid REFERENCES public.training_sessions(id) ON DELETE SET NULL,
ADD COLUMN status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
ADD COLUMN read_at timestamp with time zone DEFAULT NULL;

-- Create index for faster queries
CREATE INDEX idx_suggestions_status ON public.training_focus_suggestions(status);
CREATE INDEX idx_suggestions_session ON public.training_focus_suggestions(session_id);

-- Update RLS to allow admins to update suggestions (for approval/rejection)
DROP POLICY IF EXISTS "Users can update own suggestions" ON public.training_focus_suggestions;

CREATE POLICY "Users or admins can update suggestions" 
ON public.training_focus_suggestions 
FOR UPDATE 
USING ((auth.uid() = user_id) OR is_trainer_or_admin(auth.uid()));