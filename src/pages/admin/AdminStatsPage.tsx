import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Trophy, Pencil, AlertCircle } from 'lucide-react';
import { StatStepper } from '@/components/admin/StatStepper';


interface PlayerStats {
  id: string;
  user_id: string;
  username: string;
  first_name: string;
  avatar_id: number | null;
  sessions_attended: number;
  crossbars_hit: number;
  shooting_speed: number;
  running_speed: number;
  session_quota: number;
  isPlayerOnly: boolean;
}

export default function AdminStatsPage() {
  const { isTrainerOrAdmin, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [editingPlayer, setEditingPlayer] = useState<PlayerStats | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    sessions_attended: 0,
    crossbars_hit: 0,
    shooting_speed: 0,
    running_speed: 0,
    session_quota: 0,
  });

  // Fetch all profiles with their roles
  const { data: players, isLoading: playersLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, username, first_name, avatar_id, sessions_attended, crossbars_hit, shooting_speed, running_speed, session_quota')
        .order('first_name', { ascending: true });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Create a map of user_id to roles
      const userRolesMap = new Map<string, string[]>();
      rolesData?.forEach((r) => {
        const existing = userRolesMap.get(r.user_id) || [];
        existing.push(r.role);
        userRolesMap.set(r.user_id, existing);
      });

      // Mark each profile as player-only or not
      return profilesData.map((profile) => {
        const roles = userRolesMap.get(profile.user_id) || [];
        const hasAdminOrTrainer = roles.includes('admin') || roles.includes('trainer');
        return {
          ...profile,
          sessions_attended: profile.sessions_attended || 0,
          crossbars_hit: profile.crossbars_hit || 0,
          shooting_speed: profile.shooting_speed || 0,
          running_speed: profile.running_speed || 0,
          session_quota: profile.session_quota || 0,
          isPlayerOnly: !hasAdminOrTrainer,
        } as PlayerStats;
      });
    },
  });

  // Update stats mutation
  const updateStatsMutation = useMutation({
    mutationFn: async ({ id, stats }: { id: string; stats: Partial<PlayerStats> }) => {
      const { isPlayerOnly, ...dbStats } = stats;
      const { error } = await supabase
        .from('profiles')
        .update(dbStats)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast({ title: 'Statistieken bijgewerkt', description: 'De statistieken zijn succesvol opgeslagen.' });
      setIsDialogOpen(false);
      setEditingPlayer(null);
    },
    onError: (error) => {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    },
  });

  type NumericStatField =
    | 'sessions_attended'
    | 'crossbars_hit'
    | 'shooting_speed'
    | 'running_speed'
    | 'session_quota';



  const [pendingId, setPendingId] = useState<string | null>(null);
  const adjustStatMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: NumericStatField; value: number }) => {
      const payload: Record<NumericStatField, number | undefined> = {
        sessions_attended: undefined,
        crossbars_hit: undefined,
        shooting_speed: undefined,
        running_speed: undefined,
        session_quota: undefined,
      };
      payload[field] = value;
      const { error } = await supabase
        .from('profiles')
        .update({
          ...(payload.sessions_attended !== undefined && { sessions_attended: payload.sessions_attended }),
          ...(payload.crossbars_hit !== undefined && { crossbars_hit: payload.crossbars_hit }),
          ...(payload.shooting_speed !== undefined && { shooting_speed: payload.shooting_speed }),
          ...(payload.running_speed !== undefined && { running_speed: payload.running_speed }),
          ...(payload.session_quota !== undefined && { session_quota: payload.session_quota }),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: ({ id }) => setPendingId(id),
    onSettled: () => setPendingId(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (error) => {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    },
  });

  const adjustStat = (id: string, field: NumericStatField, value: number) => {
    adjustStatMutation.mutate({ id, field, value });
  };

  const [speedDrafts, setSpeedDrafts] = useState<Record<string, string>>({});

  const renderSpeedInput = (
    player: PlayerStats,
    field: 'shooting_speed' | 'running_speed',
    className = 'h-9 w-24 mx-auto text-center',
  ) => {
    const key = `${player.id}:${field}`;
    const value = speedDrafts[key] ?? String(player[field] ?? 0);
    return (
      <Input
        type="text"
        inputMode="decimal"
        className={className}
        disabled={pendingId === player.id}
        value={value}
        onChange={(e) => {
          const v = e.target.value.replace(',', '.');
          if (v === '' || /^\d*\.?\d*$/.test(v)) {
            setSpeedDrafts((prev) => ({ ...prev, [key]: v }));
          }
        }}
        onBlur={() => {
          const raw = speedDrafts[key];
          if (raw === undefined) return;
          const num = Number(raw);
          setSpeedDrafts((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
          if (!Number.isFinite(num) || num === (player[field] ?? 0)) return;
          adjustStat(player.id, field, num);
        }}
      />
    );
  };




  const handleEditPlayer = (player: PlayerStats) => {
    setEditingPlayer(player);
    setFormData({
      sessions_attended: player.sessions_attended || 0,
      crossbars_hit: player.crossbars_hit || 0,
      shooting_speed: player.shooting_speed || 0,
      running_speed: player.running_speed || 0,
      session_quota: player.session_quota || 0,
    });
    setIsDialogOpen(true);
  };

  const handleSaveStats = () => {
    if (!editingPlayer) return;

    const stats: Partial<PlayerStats> = {
      sessions_attended: formData.sessions_attended,
      crossbars_hit: formData.crossbars_hit,
      shooting_speed: formData.shooting_speed,
      running_speed: formData.running_speed,
    };

    // Only include session_quota for players (not admins/trainers)
    if (editingPlayer.isPlayerOnly) {
      stats.session_quota = formData.session_quota;
    }

    updateStatsMutation.mutate({
      id: editingPlayer.id,
      stats,
    });
  };

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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Statistieken Invoeren</h1>
            <p className="text-muted-foreground">Beheer de statistieken van alle spelers</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Speler Statistieken
            </CardTitle>
          </CardHeader>
          <CardContent>
            {playersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : players && players.length > 0 ? (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Speler</TableHead>
                        <TableHead className="text-center">Strippenkaart</TableHead>
                        <TableHead className="text-center">Trainingen over</TableHead>
                        <TableHead className="text-center">Trainingen</TableHead>
                        <TableHead className="text-center">Lat Geraakt</TableHead>
                        <TableHead className="text-center">Schot (km/u)</TableHead>
                        <TableHead className="text-center">Snelheid (km/u)</TableHead>
                        <TableHead className="text-right">Bewerken</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {players.map((player) => {
                        const trainingsRemaining = player.isPlayerOnly 
                          ? player.session_quota - player.sessions_attended
                          : null;
                        
                        return (
                          <TableRow key={player.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <AvatarDisplay avatarId={player.avatar_id || 1} size="sm" />
                                <div>
                                  <p className="font-medium">{player.first_name}</p>
                                  <p className="text-xs text-muted-foreground">{player.username}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {player.isPlayerOnly ? (
                                <StatStepper
                                  value={player.session_quota}
                                  disabled={pendingId === player.id}
                                  onChange={(v) => adjustStat(player.id, 'session_quota', v)}
                                />
                              ) : '-'}
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {trainingsRemaining !== null ? (
                                <span className={`inline-flex items-center gap-1 ${trainingsRemaining <= 0 ? 'text-destructive' : ''}`}>
                                  {trainingsRemaining}
                                  {trainingsRemaining <= 0 && (
                                    <AlertCircle className="w-4 h-4" />
                                  )}
                                </span>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              <StatStepper
                                value={player.sessions_attended || 0}
                                disabled={pendingId === player.id}
                                onChange={(v) => adjustStat(player.id, 'sessions_attended', v)}
                              />
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              <StatStepper
                                value={player.crossbars_hit || 0}
                                disabled={pendingId === player.id}
                                onChange={(v) => adjustStat(player.id, 'crossbars_hit', v)}
                              />
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {renderSpeedInput(player, 'shooting_speed')}
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {renderSpeedInput(player, 'running_speed')}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditPlayer(player)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {players.map((player) => {
                    const trainingsRemaining = player.isPlayerOnly 
                      ? player.session_quota - player.sessions_attended
                      : null;
                    
                    return (
                      <div 
                        key={player.id} 
                        className="p-3 border border-border rounded-lg space-y-3"
                      >
                        <div className="flex items-center gap-3">
                          <AvatarDisplay avatarId={player.avatar_id || 1} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{player.first_name}</p>
                            {player.isPlayerOnly && trainingsRemaining !== null && (
                              <p className={`text-xs mt-0.5 ${trainingsRemaining <= 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                📋 {trainingsRemaining} trainingen over
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditPlayer(player)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {player.isPlayerOnly && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Strippenkaart</span>
                              <StatStepper
                                value={player.session_quota}
                                disabled={pendingId === player.id}
                                onChange={(v) => adjustStat(player.id, 'session_quota', v)}
                              />
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Trainingen</span>
                            <StatStepper
                              value={player.sessions_attended || 0}
                              disabled={pendingId === player.id}
                              onChange={(v) => adjustStat(player.id, 'sessions_attended', v)}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Lat geraakt</span>
                            <StatStepper
                              value={player.crossbars_hit || 0}
                              disabled={pendingId === player.id}
                              onChange={(v) => adjustStat(player.id, 'crossbars_hit', v)}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Schot (km/u)</span>
                            {renderSpeedInput(player, 'shooting_speed', 'h-9 w-24 text-right')}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Snelheid (km/u)</span>
                            {renderSpeedInput(player, 'running_speed', 'h-9 w-24 text-right')}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nog geen spelers geregistreerd.
              </p>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingPlayer(null);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Statistieken bewerken voor {editingPlayer?.first_name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                {editingPlayer?.isPlayerOnly && (
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="quota">Strippenkaart (tegoed)</Label>
                    <Input
                      id="quota"
                      type="number"
                      min="0"
                      value={formData.session_quota}
                      onChange={(e) => setFormData({ ...formData, session_quota: parseInt(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Trainingen over: {formData.session_quota - formData.sessions_attended}
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="sessions">Aantal Trainingen</Label>
                  <Input
                    id="sessions"
                    type="number"
                    min="0"
                    value={formData.sessions_attended}
                    onChange={(e) => setFormData({ ...formData, sessions_attended: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="crossbars">Lat Geraakt</Label>
                  <Input
                    id="crossbars"
                    type="number"
                    min="0"
                    value={formData.crossbars_hit}
                    onChange={(e) => setFormData({ ...formData, crossbars_hit: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shooting">Hardste Schot (km/u)</Label>
                  <Input
                    id="shooting"
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.shooting_speed}
                    onChange={(e) => setFormData({ ...formData, shooting_speed: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="running">Snelheid (km/u)</Label>
                  <Input
                    id="running"
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.running_speed}
                    onChange={(e) => setFormData({ ...formData, running_speed: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <Button
                onClick={handleSaveStats}
                className="w-full"
                disabled={updateStatsMutation.isPending}
              >
                {updateStatsMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Opslaan
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}