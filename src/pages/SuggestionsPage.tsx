import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Lightbulb, Send, Loader2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';

interface Suggestion {
  id: string;
  suggestion: string;
  created_at: string;
  profiles: { first_name: string; avatar_id: number } | null;
}

export default function SuggestionsPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [newSuggestion, setNewSuggestion] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    const { data } = await supabase
      .from('training_focus_suggestions')
      .select('*, profiles(first_name, avatar_id)')
      .order('created_at', { ascending: false });
    setSuggestions((data as Suggestion[]) || []);
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!user || !newSuggestion.trim()) return;
    setIsSubmitting(true);
    
    const { error } = await supabase
      .from('training_focus_suggestions')
      .insert({ user_id: user.id, suggestion: newSuggestion.trim() });

    if (!error) {
      toast({ title: 'Bedankt! 💡', description: 'Je suggestie is verstuurd.' });
      setNewSuggestion('');
      fetchSuggestions();
    }
    setIsSubmitting(false);
  };

  if (!user) return <Navigate to="/inloggen" replace />;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <Lightbulb className="w-12 h-12 text-primary mx-auto mb-2" />
          <h1 className="text-3xl font-bold">Training Suggesties</h1>
          <p className="text-muted-foreground">Wat wil jij graag oefenen?</p>
        </div>

        <Card className="mb-8">
          <CardContent className="pt-6">
            <Textarea
              value={newSuggestion}
              onChange={(e) => setNewSuggestion(e.target.value)}
              placeholder="Bijv: Ik wil graag meer oefenen met koppen!"
              rows={3}
            />
            <Button onClick={handleSubmit} disabled={isSubmitting || !newSuggestion.trim()} className="mt-3 w-full">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Verstuur
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {suggestions.map((s) => (
            <Card key={s.id}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <AvatarDisplay avatarId={s.profiles?.avatar_id || 1} size="sm" />
                  <div>
                    <p className="font-medium">{s.profiles?.first_name || 'Speler'}</p>
                    <p className="text-muted-foreground text-sm">{format(new Date(s.created_at), 'd MMM yyyy', { locale: nl })}</p>
                    <p className="mt-2">{s.suggestion}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
