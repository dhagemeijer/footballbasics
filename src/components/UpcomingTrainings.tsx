import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Calendar, Clock, Users, ArrowRight, Loader2, Check, X } from 'lucide-react';

interface UpcomingSession {
  id: string;
  title: string;
  description: string | null;
  session_date: string;
  session_time: string;
  max_participants: number;
  signup_count: number;
  user_signed_up: boolean;
}

export function UpcomingTrainings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<UpcomingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [signingUp, setSigningUp] = useState<string | null>(null);

  const fetchUpcomingSessions = useCallback(async () => {
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');

    const { data: sessionsData } = await supabase
      .from('training_sessions')
      .select('id, title, description, session_date, session_time, max_participants')
      .eq('is_completed', false)
      .gte('session_date', today)
      .order('session_date', { ascending: true })
      .order('session_time', { ascending: true });

    // Only keep sessions whose start moment (date + time, local NL time) is in the future
    const upcoming = (sessionsData || []).filter((s) => {
      const time = (s.session_time || '00:00:00').slice(0, 8);
      const start = new Date(`${s.session_date}T${time}`);
      return !isNaN(start.getTime()) && start > now;
    }).slice(0, 2);

    if (upcoming.length === 0) {
      setSessions([]);
      setIsLoading(false);
      return;
    }

    const { data: counts } = await supabase.rpc('get_player_signup_counts');
    const countMap = new Map<string, number>(
      (counts || []).map((c: { session_id: string; player_count: number }) => [
        c.session_id,
        Number(c.player_count),
      ])
    );

    let mySignups: string[] = [];
    if (user) {
      const { data } = await supabase
        .from('session_signups')
        .select('session_id')
        .eq('user_id', user.id)
        .in('session_id', upcoming.map((s) => s.id));
      mySignups = (data || []).map((r) => r.session_id);
    }

    setSessions(
      upcoming.map((s) => ({
        ...s,
        signup_count: countMap.get(s.id) || 0,
        user_signed_up: mySignups.includes(s.id),
      }))
    );
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchUpcomingSessions();
  }, [fetchUpcomingSessions]);

  const handleSignup = async (sessionId: string) => {
    if (!user) return;
    setSigningUp(sessionId);
    const { error } = await supabase
      .from('session_signups')
      .insert({ session_id: sessionId, user_id: user.id });

    if (error) {
      toast({
        title: 'Fout',
        description: 'Kon je niet inschrijven. Probeer het opnieuw.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Ingeschreven! 🎉',
        description: 'Je bent succesvol ingeschreven voor deze training.',
      });
      await fetchUpcomingSessions();
    }
    setSigningUp(null);
  };

  const handleCancelSignup = async (sessionId: string) => {
    if (!user) return;
    setSigningUp(sessionId);
    const { error } = await supabase
      .from('session_signups')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: 'Fout',
        description: 'Kon je niet uitschrijven. Probeer het opnieuw.',
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Uitgeschreven', description: 'Je inschrijving is geannuleerd.' });
      await fetchUpcomingSessions();
    }
    setSigningUp(null);
  };

  if (isLoading) {
    return (
      <section className="container mx-auto px-4 py-16">
        <div className="flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (sessions.length === 0) {
    return null;
  }

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-8 text-white flex items-center justify-center gap-3">
          <Calendar className="w-8 h-8 text-primary" />
          Aankomende trainingen
        </h2>

        <div className="space-y-4 mb-6">
          {sessions.map((session) => {
            const isFull = session.max_participants - session.signup_count <= 0;
            const isBusy = signingUp === session.id;

            return (
              <Card key={session.id} className="hover-lift">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">{session.title}</CardTitle>
                      {session.description && (
                        <CardDescription>{session.description}</CardDescription>
                      )}
                    </div>
                    {session.user_signed_up && (
                      <Badge className="bg-success text-success-foreground">
                        <Check className="w-3 h-3 mr-1" />
                        Ingeschreven
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(parseISO(session.session_date), 'EEEE d MMMM', { locale: nl })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {session.session_time.slice(0, 5)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {session.signup_count}/{session.max_participants} spelers
                      </span>
                    </div>

                    {!user && (
                      <Button size="sm" asChild>
                        <Link to="/inloggen">
                          <Check className="w-4 h-4 mr-1" />
                          Inschrijven
                        </Link>
                      </Button>
                    )}

                    {user && (
                      <div>
                        {session.user_signed_up ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelSignup(session.id)}
                            disabled={isBusy}
                            className="text-destructive hover:text-destructive"
                          >
                            {isBusy ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <X className="w-4 h-4 mr-1" />
                                Uitschrijven
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleSignup(session.id)}
                            disabled={isBusy || isFull}
                          >
                            {isBusy ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : isFull ? (
                              'Vol'
                            ) : (
                              <>
                                <Check className="w-4 h-4 mr-1" />
                                Inschrijven
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center">
          <Button variant="secondary" asChild className="gap-2">
            <Link to="/trainingen">
              Alle trainingen bekijken
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
