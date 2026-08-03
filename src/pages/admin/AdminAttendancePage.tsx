import { useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Loader2, ArrowLeft, UserPlus, Calendar, Clock, MapPin, Search } from 'lucide-react';

interface SignupWithProfile {
  id: string;
  user_id: string;
  attended: boolean;
  crossbars_hit: number | null;
  shooting_speed: number | null;
  running_speed: number | null;
  profile: {
    first_name: string;
    username: string;
    avatar_id: number | null;
  };
}

interface StatsDraft {
  crossbars_hit: string;
  shooting_speed: string;
  running_speed: string;
}

interface ProfileForAdd {
  id: string;
  user_id: string;
  first_name: string;
  username: string;
  avatar_id: number | null;
}

export default function AdminAttendancePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { isTrainerOrAdmin, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statsDrafts, setStatsDrafts] = useState<Record<string, StatsDraft>>({});

  // Fetch session details
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['admin-session', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('id', sessionId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });

  // Fetch signups with profiles
  const { data: signups, isLoading: signupsLoading } = useQuery({
    queryKey: ['admin-session-signups', sessionId],
    queryFn: async () => {
      const { data: signupsData, error } = await supabase
        .from('session_signups')
        .select('id, user_id, attended, crossbars_hit, shooting_speed, running_speed')
        .eq('session_id', sessionId!);
      if (error) throw error;

      // Fetch profiles for signed up users
      const userIds = signupsData.map((s) => s.user_id);
      if (userIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, username, avatar_id')
        .in('user_id', userIds);
      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles.map((p) => [p.user_id, p]));

      return signupsData.map((s) => ({
        ...s,
        attended: s.attended ?? false,
        profile: profileMap.get(s.user_id) || { first_name: 'Onbekend', username: '', avatar_id: 1 },
      })) as SignupWithProfile[];
    },
    enabled: !!sessionId,
  });

  // Fetch all profiles for adding players
  const { data: allProfiles } = useQuery({
    queryKey: ['all-profiles-for-add'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, username, avatar_id')
        .order('first_name', { ascending: true });
      if (error) throw error;
      return data as ProfileForAdd[];
    },
    enabled: isAddDialogOpen,
  });

  // Toggle attendance
  const toggleAttendanceMutation = useMutation({
    mutationFn: async ({ signupId, attended }: { signupId: string; attended: boolean }) => {
      const { error } = await supabase
        .from('session_signups')
        .update({ attended })
        .eq('id', signupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-session-signups', sessionId] });
    },
    onError: (error) => {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    },
  });

  // Save per-session stats
  const saveStatsMutation = useMutation({
    mutationFn: async ({ signupId, draft }: { signupId: string; draft: StatsDraft }) => {
      const toNum = (v: string) => {
        const t = v.trim();
        if (t === '') return null;
        const n = Number(t.replace(',', '.'));
        if (!Number.isFinite(n) || n < 0) throw new Error('Voer een geldig positief getal in.');
        return n;
      };
      const payload = {
        crossbars_hit: toNum(draft.crossbars_hit) ?? 0,
        shooting_speed: toNum(draft.shooting_speed),
        running_speed: toNum(draft.running_speed),
      };
      const { error } = await supabase.from('session_signups').update(payload).eq('id', signupId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      setStatsDrafts((prev) => {
        const next = { ...prev };
        delete next[vars.signupId];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['admin-session-signups', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['admin-players'] });
      toast({ title: 'Opgeslagen', description: 'Statistieken zijn bijgewerkt.' });
    },
    onError: (error) => {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    },
  });

  // Add player to session
  const addPlayerMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('session_signups')
        .insert({ session_id: sessionId!, user_id: userId });
      if (error) {
        if (error.code === '23505') {
          throw new Error('Deze speler is al ingeschreven voor deze training.');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-session-signups', sessionId] });
      toast({ title: 'Speler toegevoegd', description: 'De speler is ingeschreven voor deze training.' });
    },
    onError: (error) => {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    },
  });

  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isTrainerOrAdmin) {
    return <Navigate to="/" replace />;
  }

  const isLoading = sessionLoading || signupsLoading;
  const signedUpUserIds = new Set(signups?.map((s) => s.user_id) || []);
  const availablePlayers = allProfiles?.filter(
    (p) => !signedUpUserIds.has(p.user_id) && p.first_name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const attendedCount = signups?.filter((s) => s.attended).length || 0;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Link to="/admin/trainingen">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Aanwezigheid</h1>
              {session && (
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(new Date(session.session_date), 'EEEE d MMMM', { locale: nl })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {session.session_time.slice(0, 5)}
                  </span>
                  {session.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {session.location}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg">
                Ingeschreven spelers ({signups?.length || 0})
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  • {attendedCount} aanwezig
                </span>
              </CardTitle>
              <Button size="sm" onClick={() => { setIsAddDialogOpen(true); setSearchQuery(''); }}>
                <UserPlus className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Speler toevoegen</span>
                <span className="sm:hidden">Toevoegen</span>
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : signups && signups.length > 0 ? (
                <div className="space-y-2">
                  {signups.map((signup) => (
                    <div
                      key={signup.id}
                      className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={signup.attended}
                        onCheckedChange={(checked) =>
                          toggleAttendanceMutation.mutate({
                            signupId: signup.id,
                            attended: checked as boolean,
                          })
                        }
                      />
                      <AvatarDisplay avatarId={signup.profile.avatar_id || 1} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{signup.profile.first_name}</p>
                        <p className="text-xs text-muted-foreground">{signup.profile.username}</p>
                      </div>
                      {signup.attended && (
                        <span className="text-xs text-primary font-medium">Aanwezig</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nog geen spelers ingeschreven voor deze training.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Player Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Speler toevoegen</DialogTitle>
          </DialogHeader>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Zoek op naam..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto space-y-1 mt-2">
            {availablePlayers.length > 0 ? (
              availablePlayers.map((player) => (
                <button
                  key={player.id}
                  className="flex items-center gap-3 w-full p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
                  onClick={() => addPlayerMutation.mutate(player.user_id)}
                  disabled={addPlayerMutation.isPending}
                >
                  <AvatarDisplay avatarId={player.avatar_id || 1} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{player.first_name}</p>
                    <p className="text-xs text-muted-foreground">{player.username}</p>
                  </div>
                  <UserPlus className="w-4 h-4 text-muted-foreground" />
                </button>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4 text-sm">
                {searchQuery ? 'Geen spelers gevonden.' : 'Alle spelers zijn al ingeschreven.'}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
