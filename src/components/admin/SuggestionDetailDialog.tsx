import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Check, X, Loader2, Calendar, MapPin, Save } from 'lucide-react';
import type { Suggestion } from '@/hooks/useSuggestions';

interface SuggestionDetailDialogProps {
  suggestion: Suggestion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdate: (id: string, status: 'approved' | 'rejected') => Promise<{ error: any }>;
}

export function SuggestionDetailDialog({
  suggestion,
  open,
  onOpenChange,
  onStatusUpdate
}: SuggestionDetailDialogProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTrainingEdit, setShowTrainingEdit] = useState(false);
  const [trainingDescription, setTrainingDescription] = useState('');
  const [trainingTitle, setTrainingTitle] = useState('');
  const [trainingLocation, setTrainingLocation] = useState('');

  useEffect(() => {
    if (suggestion?.session) {
      setTrainingTitle(suggestion.session.title);
    }
  }, [suggestion]);

  const handleApprove = async () => {
    if (!suggestion) return;
    
    // Load training details for editing
    if (suggestion.session_id) {
      const { data: session } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('id', suggestion.session_id)
        .maybeSingle();
      
      if (session) {
        setTrainingTitle(session.title);
        setTrainingLocation(session.location || '');
        // Prepend suggestion to existing description
        const existingDesc = session.description || '';
        setTrainingDescription(
          existingDesc 
            ? `${suggestion.suggestion}\n\n${existingDesc}`
            : suggestion.suggestion
        );
        setShowTrainingEdit(true);
      }
    } else {
      // No session linked, just approve
      await confirmApproval();
    }
  };

  const confirmApproval = async () => {
    if (!suggestion) return;
    setIsProcessing(true);
    
    // Update training if we have one
    if (suggestion.session_id && showTrainingEdit) {
      const { error: updateError } = await supabase
        .from('training_sessions')
        .update({
          title: trainingTitle,
          location: trainingLocation,
          description: trainingDescription
        })
        .eq('id', suggestion.session_id);
      
      if (updateError) {
        toast({
          title: 'Fout',
          description: 'Kon de training niet bijwerken.',
          variant: 'destructive'
        });
        setIsProcessing(false);
        return;
      }
    }

    const { error } = await onStatusUpdate(suggestion.id, 'approved');
    setIsProcessing(false);
    
    if (!error) {
      toast({
        title: 'Geaccepteerd! ✅',
        description: 'De suggestie is goedgekeurd.'
      });
      setShowTrainingEdit(false);
      onOpenChange(false);
    }
  };

  const handleReject = async () => {
    if (!suggestion) return;
    setIsProcessing(true);
    
    const { error } = await onStatusUpdate(suggestion.id, 'rejected');
    setIsProcessing(false);
    
    if (!error) {
      toast({
        title: 'Afgekeurd',
        description: 'De suggestie is afgekeurd.'
      });
      onOpenChange(false);
    }
  };

  if (!suggestion) return null;

  const statusBadge = {
    pending: null,
    approved: <Badge className="bg-green-500">Geaccepteerd</Badge>,
    rejected: <Badge variant="destructive">Afgekeurd</Badge>
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Training Suggestie
            {statusBadge[suggestion.status]}
          </DialogTitle>
          <DialogDescription>
            Ingediend op {format(new Date(suggestion.created_at), 'd MMMM yyyy', { locale: nl })}
          </DialogDescription>
        </DialogHeader>

        {!showTrainingEdit ? (
          <div className="space-y-4">
            {/* User info */}
            <div className="flex items-center gap-3">
              <AvatarDisplay avatarId={suggestion.profile?.avatar_id || 1} size="sm" />
              <span className="font-medium">{suggestion.profile?.first_name || 'Speler'}</span>
            </div>

            {/* Suggestion text */}
            <div className="bg-secondary/50 rounded-lg p-4">
              <p>{suggestion.suggestion}</p>
            </div>

            {/* Linked session */}
            {suggestion.session && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>
                  {suggestion.session.title} - {format(new Date(suggestion.session.session_date), 'd MMM yyyy', { locale: nl })}
                </span>
              </div>
            )}

            {/* Actions */}
            {suggestion.status === 'pending' && (
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={handleReject}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 mr-2" />}
                  Afkeuren
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                  Goedkeuren
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Bewerk de training en sla op om de suggestie goed te keuren.
            </p>

            <div className="space-y-2">
              <Label>Titel</Label>
              <Input
                value={trainingTitle}
                onChange={(e) => setTrainingTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Locatie</Label>
              <Input
                value={trainingLocation}
                onChange={(e) => setTrainingLocation(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Focus / Omschrijving</Label>
              <Textarea
                value={trainingDescription}
                onChange={(e) => setTrainingDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowTrainingEdit(false)}
                disabled={isProcessing}
              >
                Terug
              </Button>
              <Button
                onClick={confirmApproval}
                disabled={isProcessing}
                className="flex-1"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Opslaan & Goedkeuren
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
