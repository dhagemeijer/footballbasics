import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Trophy, Zap, Target, Medal, Filter, User, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  id: string;
  user_id: string;
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
  const { user, isLoading: authLoading } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortField>('sessions_attended');
  const [showTrainers, setShowTrainers] = useState(true);
  const [showPlayers, setShowPlayers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
      // Prioritize trainer > admin > player (show Trainer instead of Admin when both)
      const current = rolesMap.get(r.user_id);
      if (!current || (r.role === 'trainer') || (r.role === 'admin' && current === 'player')) {
        rolesMap.set(r.user_id, r.role);
      }
    });

    const leaderboard: LeaderboardEntry[] = (profiles || []).map(profile => ({
      id: profile.id,
      user_id: profile.user_id,
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

  // Filter entries based on role selection and search query
  const filteredEntries = entries.filter(entry => {
    const isTrainer = entry.role === 'trainer' || entry.role === 'admin';
    const matchesRole = isTrainer ? showTrainers : showPlayers;
    const matchesSearch = entry.first_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const sortedEntries = [...filteredEntries].sort((a, b) => b[sortBy] - a[sortBy]);

  // Find current user's position in the full sorted list (not filtered)
  const allSortedEntries = [...entries].sort((a, b) => b[sortBy] - a[sortBy]);
  const currentUserPosition = user 
    ? allSortedEntries.findIndex(e => e.user_id === user.id) + 1 
    : 0;
  const currentUserInList = user 
    ? sortedEntries.find(e => e.user_id === user.id) 
    : null;

  const sortButtons: { field: SortField; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { field: 'sessions_attended', label: 'Trainingen', icon: Medal },
    { field: 'crossbars_hit', label: 'Latjes', icon: Target },
    { field: 'shooting_speed', label: 'Schotkracht', icon: Trophy },
    { field: 'running_speed', label: 'Snelheid', icon: Zap },
  ];

  if (!authLoading && !user) {
    return <Navigate to="/inloggen" replace />;
  }

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

          {/* Current User Position Indicator */}
          {user && currentUserPosition > 0 && (
            <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-center gap-3">
                <User className="w-5 h-5 text-primary" />
                <span className="font-medium">
                  Jouw positie: <span className="text-primary font-bold text-lg">#{currentUserPosition}</span>
                </span>
                <span className="text-muted-foreground">
                  van {entries.length} spelers
                </span>
              </div>
            </div>
          )}

          {/* Search Input */}
          <div className="relative max-w-sm mx-auto mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Zoek op naam..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Sort Buttons */}
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {sortButtons.map(({ field, label, icon: Icon }) => (
              <button
                key={field}
                onClick={() => setSortBy(field)}
                className={cn(
                  'flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg font-medium transition-all text-sm sm:text-base',
                  sortBy === field
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:bg-secondary'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Filter Options */}
          <div className="flex justify-center gap-6 mb-8">
            <div className="flex flex-wrap items-center justify-center gap-2 bg-card rounded-lg px-3 sm:px-4 py-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground mr-2 hidden sm:inline">Toon:</span>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="show-trainers"
                  checked={showTrainers}
                  onCheckedChange={(checked) => setShowTrainers(checked === true)}
                />
                <Label htmlFor="show-trainers" className="text-sm cursor-pointer">
                  Trainers
                </Label>
              </div>
              <div className="flex items-center gap-2 ml-2 sm:ml-4">
                <Checkbox
                  id="show-players"
                  checked={showPlayers}
                  onCheckedChange={(checked) => setShowPlayers(checked === true)}
                />
                <Label htmlFor="show-players" className="text-sm cursor-pointer">
                  Spelers
                </Label>
              </div>
            </div>
          </div>

          {/* Leaderboard - Desktop Header */}
          <Card>
            <CardHeader className="pb-0 hidden md:block">
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
            <CardContent className="divide-y divide-border p-0 sm:p-6">
              {sortedEntries.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Nog geen spelers in de ranglijst.
                </div>
              ) : (
                sortedEntries.map((entry, index) => {
                  const isCurrentUser = user && entry.user_id === user.id;
                  return (
                    <div key={entry.id}>
                      {/* Desktop Row */}
                      <div
                        className={cn(
                          'hidden md:grid grid-cols-12 gap-4 items-center py-4 px-4 relative',
                          index < 3 && 'bg-primary/5',
                          isCurrentUser && 'bg-accent ring-2 ring-primary ring-inset'
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
                          <div className="flex items-center flex-wrap gap-1">
                            <span className="font-medium">{entry.first_name}</span>
                            {isCurrentUser && (
                              <Badge variant="default" className="text-xs">
                                Jij
                              </Badge>
                            )}
                            {entry.role !== 'player' && (
                              <Badge variant="secondary" className="text-xs">
                                {entry.role === 'admin' ? 'Admin' : 'Trainer'}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className={cn(
                          'col-span-2 text-center font-medium',
                          sortBy === 'sessions_attended' && (isCurrentUser ? 'text-accent-foreground' : 'text-primary')
                        )}>
                          {entry.sessions_attended}
                        </div>
                        <div className={cn(
                          'col-span-1 text-center',
                          sortBy === 'crossbars_hit' && (isCurrentUser ? 'text-accent-foreground' : 'text-primary')
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
                          sortBy === 'shooting_speed' && (isCurrentUser ? 'text-accent-foreground' : 'text-primary')
                        )}>
                          {entry.shooting_speed > 0 ? `${entry.shooting_speed}` : '-'}
                        </div>
                        <div className={cn(
                          'col-span-2 text-center font-medium',
                          sortBy === 'running_speed' && (isCurrentUser ? 'text-accent-foreground' : 'text-primary')
                        )}>
                          {entry.running_speed > 0 ? `${entry.running_speed}` : '-'}
                        </div>
                      </div>

                      {/* Mobile Row - Compact Card */}
                      <div
                        className={cn(
                          'md:hidden flex items-center gap-3 p-3',
                          index < 3 && 'bg-primary/5',
                          isCurrentUser && 'bg-accent ring-2 ring-primary ring-inset'
                        )}
                      >
                        {/* Rank */}
                        <div className="flex-shrink-0 w-8 text-center">
                          {index === 0 ? (
                            <span className="text-xl">🥇</span>
                          ) : index === 1 ? (
                            <span className="text-xl">🥈</span>
                          ) : index === 2 ? (
                            <span className="text-xl">🥉</span>
                          ) : (
                            <span className="text-base font-bold text-muted-foreground">
                              {index + 1}
                            </span>
                          )}
                        </div>

                        {/* Avatar */}
                        <AvatarDisplay avatarId={entry.avatar_id} size="sm" />

                        {/* Name and badges */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="font-medium truncate">{entry.first_name}</span>
                            {isCurrentUser && (
                              <Badge variant="default" className="text-xs">Jij</Badge>
                            )}
                            {entry.role !== 'player' && (
                              <Badge variant="secondary" className="text-xs">
                                {entry.role === 'admin' ? 'Admin' : 'Trainer'}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Current Sort Value - Highlighted */}
                        <div className="flex-shrink-0 text-right">
                          <div className={cn(
                            'text-lg font-bold',
                            isCurrentUser ? 'text-accent-foreground' : 'text-primary'
                          )}>
                            {sortBy === 'sessions_attended' && entry.sessions_attended}
                            {sortBy === 'crossbars_hit' && entry.crossbars_hit}
                            {sortBy === 'shooting_speed' && (entry.shooting_speed > 0 ? entry.shooting_speed : '-')}
                            {sortBy === 'running_speed' && (entry.running_speed > 0 ? entry.running_speed : '-')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {sortBy === 'sessions_attended' && 'trainingen'}
                            {sortBy === 'crossbars_hit' && 'latjes'}
                            {sortBy === 'shooting_speed' && 'km/u'}
                            {sortBy === 'running_speed' && 'km/u'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
