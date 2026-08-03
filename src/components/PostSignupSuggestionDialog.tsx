import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lightbulb, Send } from 'lucide-react';
import { FOCUS_OPTIONS } from '@/lib/trainingFocus';
import { SessionVoteResults } from '@/components/SessionVoteResults';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string | null;
  sessionTitle?: string;
  /** When set, the dialog updates this existing vote instead of creating a new one */
  suggestionId?: string | null;
  initialOptions?: string[];
  onSaved?: () => void;
}

export function PostSignupSuggestionDialog({
  open,
  onOpenChange,
  sessionId,
  sessionTitle,
  suggestionId,
  initialOptions,
  onSaved,
}: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [resultsKey, setResultsKey] = useState(0);

  useEffect(() => {
    if (open) {
      setSelected(initialOptions || []);
      setHasVoted((initialOptions?.length || 0) > 0);
      setResultsKey((k) => k + 1);
    }
  }, [open, initialOptions]);

  const close = () => {
    setSelected([]);
    onOpenChange(false);
  };

  const toggle = (opt: string) =>
    setSelected((prev) => (prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]));

  const handleSubmit = async () => {
    if (!user || !sessionId || selected.length === 0) return;
    setIsSaving(true);
    const { error } = suggestionId
      ? await supabase
          .from('training_focus_suggestions')
          .update({ options: selected })
          .eq('id', suggestionId)
      : await supabase.from('training_focus_suggestions').insert({
          user_id: user.id,
          session_id: sessionId,
          suggestion: '',
          options: selected,
        });
    setIsSaving(false);

    if (error) {
      toast({
        title: 'Fout',
        description: 'Kon je stem niet opslaan. Probeer het opnieuw.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Bedankt! 💡',
      description: suggestionId ? 'Je stem is aangepast.' : 'Je stem is uitgebracht.',
    });
    setHasVoted(true);
    setResultsKey((k) => k + 1);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            Waar wil je aan werken?
          </DialogTitle>
          <DialogDescription>
            {sessionTitle
              ? `Kies één of meer onderdelen voor "${sessionTitle}". Dit is niet verplicht.`
              : 'Kies één of meer onderdelen voor deze training. Dit is niet verplicht.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          {FOCUS_OPTIONS.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 rounded-lg border border-border p-3 cursor-pointer hover:bg-secondary/50"
            >
              <Checkbox checked={selected.includes(opt)} onCheckedChange={() => toggle(opt)} />
              <span className="text-sm font-medium">{opt}</span>
            </label>
          ))}
        </div>

        {hasVoted && sessionId && (
          <div className="pt-2 border-t border-border">
            <SessionVoteResults sessionId={sessionId} refreshKey={resultsKey} compact />
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={close} disabled={isSaving} className="flex-1">
            {hasVoted ? 'Sluiten' : 'Overslaan'}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSaving || selected.length === 0}
            className="flex-1"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {suggestionId || hasVoted ? 'Stem aanpassen' : 'Stem uitbrengen'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
