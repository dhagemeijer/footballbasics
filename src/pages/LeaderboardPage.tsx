import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trophy, Zap, Target, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  id: string;
  first_name: string;
  avatar_id: number;
  sessions_attended: number;
  crossbars_hit: number;
  running_speed: number;
  shooting_speed: number;
  role: 'player' | 'trainer' | 'admin';
}

type SortField = 'sessions_attended' | 'crossbars_hit' | 'running_speed' | 'shooting_speed';

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortField>('sessions_attended');

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setIsLoading(true);

    // Fetch profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      setIsLoading(false);
      return;
    }

    // Fetch roles for all users
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role');

    const rolesMap = new Map<string, string>();
    (roles || []).forEach(r => {
      // Prioritize admin > trainer > player
      const current = rolesMap.get(r.user_id);
      if (!current || (r.role === 'admin') || (r.role === 'trainer' && current === 'player')) {
        rolesMap.set(r.user_id, r.role);
      }
    });

    const leaderboard: LeaderboardEntry[] = (profiles || []).map(profile => ({
      id: profile.id,
      first_name: profile.first_name,
      avatar_id: profile.avatar_id || 1,
      sessions_attended: profile.sessions_attended || 0,
      crossbars_hit: profile.crossbars_hit || 0,
      running_speed: Number(profile.running_speed) || 0,
      shooting_speed: Number(profile.shooting_speed) || 0,
      role: (rolesMap.get(profile.user_id) as 'player' | 'trainer' | 'admin') || 'player',
    }));

    setEntries(leaderboard);
    setIsLoading(false);
  };

  const sortedEntries = [...entries].sort((a, b) => b[sortBy] - a[sortBy]);

  const sortButtons: { field: SortField; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { field: 'sessions_attended', label: 'Trainingen', icon: Medal },
    { field: 'crossbars_hit', label: 'Latjes', icon: Target },
    { field: 'shooting_speed', label: 'Schotkracht', icon: Trophy },
    { field: 'running_speed', label: 'Snelheid', icon: Zap },
  ];

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
            <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
              <Trophy className="w-8 h-8 text-primary" />
              Ranglijst
            </h1>
            <p className="text-muted-foreground">
              Bekijk hoe je het doet vergeleken met andere spelers!
            </p>
          </div>

          {/* Sort Buttons */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {sortButtons.map(({ field, label, icon: Icon }) => (
              <button
                key={field}
                onClick={() => setSortBy(field)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all',
                  sortBy === field
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:bg-secondary'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Leaderboard */}
          <Card>
            <CardHeader className="pb-0">
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground px-4">
                <div className="col-span-1">#</div>
                <div className="col-span-4">Speler</div>
                <button 
                  onClick={() => setSortBy('sessions_attended')}
                  className={cn(
                    'col-span-2 text-center cursor-pointer hover:text-foreground transition-colors',
                    sortBy === 'sessions_attended' && 'text-primary font-bold'
                  )}
                >
                  Trainingen
                </button>
                <button 
                  onClick={() => setSortBy('crossbars_hit')}
                  className={cn(
                    'col-span-1 text-center cursor-pointer hover:text-foreground transition-colors',
                    sortBy === 'crossbars_hit' && 'text-primary font-bold'
                  )}
                >
                  Latjes
                </button>
                <button 
                  onClick={() => setSortBy('shooting_speed')}
                  className={cn(
                    'col-span-2 text-center cursor-pointer hover:text-foreground transition-colors',
                    sortBy === 'shooting_speed' && 'text-primary font-bold'
                  )}
                >
                  Schotkracht
                </button>
                <button 
                  onClick={() => setSortBy('running_speed')}
                  className={cn(
                    'col-span-2 text-center cursor-pointer hover:text-foreground transition-colors',
                    sortBy === 'running_speed' && 'text-primary font-bold'
                  )}
                >
                  Snelheid
                </button>
              </div>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              {sortedEntries.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Nog geen spelers in de ranglijst.
                </div>
              ) : (
                sortedEntries.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={cn(
                      'grid grid-cols-12 gap-4 items-center py-4 px-4',
                      index < 3 && 'bg-primary/5'
                    )}
                  >
                    <div className="col-span-1">
                      {index === 0 ? (
                        <span className="text-2xl">🥇</span>
                      ) : index === 1 ? (
                        <span className="text-2xl">🥈</span>
                      ) : index === 2 ? (
                        <span className="text-2xl">🥉</span>
                      ) : (
                        <span className="text-lg font-bold text-muted-foreground">
                          {index + 1}
                        </span>
                      )}
                    </div>
                    <div className="col-span-4 flex items-center gap-3">
                      <AvatarDisplay avatarId={entry.avatar_id} size="sm" />
                      <div>
                        <span className="font-medium">{entry.first_name}</span>
                        {entry.role !== 'player' && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {entry.role === 'admin' ? 'Admin' : 'Trainer'}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className={cn(
                      'col-span-2 text-center font-medium',
                      sortBy === 'sessions_attended' && 'text-primary'
                    )}>
                      {entry.sessions_attended}
                    </div>
                    <div className={cn(
                      'col-span-1 text-center',
                      sortBy === 'crossbars_hit' && 'text-primary'
                    )}>
                      <div className="font-medium">{entry.crossbars_hit}</div>
                      {entry.sessions_attended > 0 && (
                        <div className="text-xs text-muted-foreground">
                          ({(entry.crossbars_hit / entry.sessions_attended).toFixed(1)}/tr)
                        </div>
                      )}
                    </div>
                    <div className={cn(
                      'col-span-2 text-center font-medium',
                      sortBy === 'shooting_speed' && 'text-primary'
                    )}>
                      {entry.shooting_speed > 0 ? `${entry.shooting_speed}` : '-'}
                    </div>
                    <div className={cn(
                      'col-span-2 text-center font-medium',
                      sortBy === 'running_speed' && 'text-primary'
                    )}>
                      {entry.running_speed > 0 ? `${entry.running_speed}` : '-'}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
