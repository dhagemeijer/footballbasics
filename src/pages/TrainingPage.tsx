import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isAfter, isBefore } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Calendar, Clock, Users, Check, X, Loader2 } from 'lucide-react';

interface TrainingSession {
  id: string;
  title: string;
  description: string | null;
  session_date: string;
  session_time: string;
  max_participants: number;
  created_at: string;
  is_completed: boolean;
  signup_count?: number;
  user_signed_up?: boolean;
}

export default function TrainingPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [signingUp, setSigningUp] = useState<string | null>(null);

  const fetchSessions = async () => {

    setIsLoading(true);
    
    // Fetch all sessions
    const { data: sessionsData, error } = await supabase
      .from('training_sessions')
      .select('*')
      .order('session_date', { ascending: true });

    if (error) {
      toast({
        title: 'Fout',
        description: 'Kon trainingen niet laden.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Player-only signup counts (trainers/admins do not count towards "X/max spelers")
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
        .eq('user_id', user.id);
      mySignups = (data || []).map((r) => r.session_id);
    }

    setSessions(
      (sessionsData || []).map((session) => ({
        ...session,
        signup_count: countMap.get(session.id) || 0,
        user_signed_up: mySignups.includes(session.id),
      }))
    );
    setIsLoading(false);
  };

  const handleSignup = async (sessionId: string) => {
    if (!user) {
      toast({
        title: 'Log eerst in',
        description: 'Je moet ingelogd zijn om je in te schrijven.',
        variant: 'destructive',
      });
      return;
    }

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
      fetchSessions();
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
      toast({
        title: 'Uitgeschreven',
        description: 'Je inschrijving is geannuleerd.',
      });
      fetchSessions();
    }
    
    setSigningUp(null);
  };

  const isPastSession = (date: string) => {
    return isBefore(parseISO(date), new Date());
  };

  // Filter out completed sessions from the regular view
  const activeSessions = sessions.filter(s => !s.is_completed);
  const upcomingSessions = activeSessions.filter(s => !isPastSession(s.session_date));
  const pastSessions = activeSessions.filter(s => isPastSession(s.session_date));

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Trainingen</h1>
            <p className="text-muted-foreground">
              Bekijk alle trainingen en schrijf je in!
            </p>
          </div>

          {/* Upcoming Sessions */}
          <section className="mb-12">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Aankomende trainingen
            </h2>
            
            {upcomingSessions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Er zijn momenteel geen aankomende trainingen gepland.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {upcomingSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    isPast={false}
                    onSignup={handleSignup}
                    onCancelSignup={handleCancelSignup}
                    signingUp={signingUp}
                    isLoggedIn={!!user}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Past Sessions */}
          {pastSessions.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-muted-foreground">
                <Clock className="w-5 h-5" />
                Afgelopen trainingen
              </h2>
              
              <div className="space-y-4 opacity-75">
                {pastSessions.slice(0, 5).map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    isPast={true}
                    onSignup={handleSignup}
                    onCancelSignup={handleCancelSignup}
                    signingUp={signingUp}
                    isLoggedIn={!!user}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </Layout>
  );
}

function SessionCard({
  session,
  isPast,
  onSignup,
  onCancelSignup,
  signingUp,
  isLoggedIn,
}: {
  session: TrainingSession;
  isPast: boolean;
  onSignup: (id: string) => void;
  onCancelSignup: (id: string) => void;
  signingUp: string | null;
  isLoggedIn: boolean;
}) {
  const spotsLeft = session.max_participants - (session.signup_count || 0);
  const isFull = spotsLeft <= 0;
  const isSigningUp = signingUp === session.id;

  return (
    <Card className={isPast ? 'bg-muted/30' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg">{session.title}</CardTitle>
            {session.description && (
              <CardDescription className="mt-1">{session.description}</CardDescription>
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
          
          {!isPast && !isLoggedIn && (
            <Button size="sm" asChild>
              <Link to="/inloggen">
                <Check className="w-4 h-4 mr-1" />
                Inschrijven
              </Link>
            </Button>
          )}

          {!isPast && isLoggedIn && (
            <div>
              {session.user_signed_up ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCancelSignup(session.id)}
                  disabled={isSigningUp}
                  className="text-destructive hover:text-destructive"
                >
                  {isSigningUp ? (
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
                  onClick={() => onSignup(session.id)}
                  disabled={isSigningUp || isFull}
                >
                  {isSigningUp ? (
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
}
