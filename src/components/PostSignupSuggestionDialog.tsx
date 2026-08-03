import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lightbulb, Send } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string | null;
  sessionTitle?: string;
}

export function PostSignupSuggestionDialog({ open, onOpenChange, sessionId, sessionTitle }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const close = () => {
    setText('');
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!user || !sessionId || !text.trim()) return;
    setIsSaving(true);
    const { error } = await supabase.from('training_focus_suggestions').insert({
      user_id: user.id,
      session_id: sessionId,
      suggestion: text.trim(),
    });
    setIsSaving(false);

    if (error) {
      toast({
        title: 'Fout',
        description: 'Kon je suggestie niet opslaan. Probeer het opnieuw.',
        variant: 'destructive',
      });
      return;
    }

    toast({ title: 'Bedankt! 💡', description: 'Je suggestie is verstuurd.' });
    close();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            Suggestie voor deze training?
          </DialogTitle>
          <DialogDescription>
            {sessionTitle
              ? `Waar wil je aan werken tijdens "${sessionTitle}"? Dit is niet verplicht.`
              : 'Waar wil je aan werken tijdens deze training? Dit is niet verplicht.'}
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="Bijv. meer op passen en schieten oefenen"
        />

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={close} disabled={isSaving} className="flex-1">
            Overslaan
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || !text.trim()} className="flex-1">
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Versturen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
