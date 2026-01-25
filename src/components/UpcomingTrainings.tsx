import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Calendar, Clock, Users, ArrowRight, Loader2 } from 'lucide-react';

interface UpcomingSession {
  id: string;
  title: string;
  description: string | null;
  session_date: string;
  session_time: string;
  max_participants: number;
  signup_count: number;
}

export function UpcomingTrainings() {
  const [sessions, setSessions] = useState<UpcomingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingSessions();
  }, []);

  const fetchUpcomingSessions = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: sessionsData } = await supabase
      .from('training_sessions')
      .select('id, title, description, session_date, session_time, max_participants')
      .eq('is_completed', false)
      .gte('session_date', today)
      .order('session_date', { ascending: true })
      .limit(2);

    if (sessionsData && sessionsData.length > 0) {
      // Get signup counts for each session
      const sessionsWithCounts = await Promise.all(
        sessionsData.map(async (session) => {
          const { count } = await supabase
            .from('session_signups')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id);

          return {
            ...session,
            signup_count: count || 0,
          };
        })
      );
      setSessions(sessionsWithCounts);
    }

    setIsLoading(false);
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
          {sessions.map((session) => (
            <Card key={session.id} className="hover-lift">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{session.title}</CardTitle>
                {session.description && (
                  <CardDescription>{session.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          ))}
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
