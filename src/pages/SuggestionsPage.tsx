import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { useToast } from '@/hooks/use-toast';
import { useSuggestions, type Suggestion } from '@/hooks/useSuggestions';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Lightbulb, Send, Loader2, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Navigate } from 'react-router-dom';

interface TrainingSession {
  id: string;
  title: string;
  session_date: string;
  session_time: string;
}

export default function SuggestionsPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { suggestions, fetchSuggestions } = useSuggestions();
  const [upcomingSessions, setUpcomingSessions] = useState<TrainingSession[]>([]);
  const [newSuggestion, setNewSuggestion] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingSessions();
  }, []);

  const fetchUpcomingSessions = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('training_sessions')
      .select('id, title, session_date, session_time')
      .eq('is_completed', false)
      .gte('session_date', today)
      .order('session_date', { ascending: true });
    
    setUpcomingSessions(data || []);
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!user || !newSuggestion.trim() || !selectedSessionId) return;
    setIsSubmitting(true);
    
    const { error } = await supabase
      .from('training_focus_suggestions')
      .insert({ 
        user_id: user.id, 
        suggestion: newSuggestion.trim(),
        session_id: selectedSessionId
      });

    if (!error) {
      toast({ title: 'Bedankt! 💡', description: 'Je suggestie is verstuurd.' });
      setNewSuggestion('');
      setSelectedSessionId('');
      fetchSuggestions();
    } else {
      toast({ 
        title: 'Fout', 
        description: 'Kon suggestie niet versturen.', 
        variant: 'destructive' 
      });
    }
    setIsSubmitting(false);
  };

  if (!user) return <Navigate to="/inloggen" replace />;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Geaccepteerd
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Afgekeurd
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            In afwachting
          </Badge>
        );
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <Lightbulb className="w-12 h-12 text-primary mx-auto mb-2" />
          <h1 className="text-3xl font-bold">Training Suggesties</h1>
          <p className="text-muted-foreground">Wat wil jij graag oefenen?</p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Nieuwe suggestie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="session">Selecteer training *</Label>
              <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Kies een aankomende training" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {upcomingSessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{session.title}</span>
                        <span className="text-muted-foreground">
                          - {format(new Date(session.session_date), 'd MMM', { locale: nl })}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="suggestion">Je suggestie *</Label>
              <Textarea
                id="suggestion"
                value={newSuggestion}
                onChange={(e) => setNewSuggestion(e.target.value)}
                placeholder="Bijv: Ik wil graag meer oefenen met koppen!"
                rows={3}
              />
            </div>

            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !newSuggestion.trim() || !selectedSessionId} 
              className="w-full"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Verstuur suggestie
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Ingediende suggesties</h2>
          
          {suggestions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nog geen suggesties ingediend
              </CardContent>
            </Card>
          ) : (
            suggestions.map((s) => (
              <Card key={s.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <AvatarDisplay avatarId={s.profile?.avatar_id || 1} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-medium">{s.profile?.first_name || 'Speler'}</p>
                        {getStatusBadge(s.status)}
                      </div>
                      <p className="text-muted-foreground text-sm mb-2">
                        {format(new Date(s.created_at), 'd MMM yyyy', { locale: nl })}
                        {s.session && (
                          <span className="ml-2">
                            • {s.session.title}
                          </span>
                        )}
                      </p>
                      <p className="mt-2">{s.suggestion}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
