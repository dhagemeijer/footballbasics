import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AvatarSelector } from '@/components/AvatarSelector';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Users, Settings2, Trash2, Plus, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

const ALL_ROLES = [
  { value: 'player', label: 'Speler' },
  { value: 'trainer', label: 'Trainer' },
  { value: 'admin', label: 'Admin' },
] as const;

type AppRole = 'player' | 'trainer' | 'admin';

const PACKAGE_OPTIONS = [
  { value: 'woensdag_los', label: 'Woensdag losse training', quota: 2 },
  { value: 'zondag_los', label: 'Zondag losse training', quota: 2 },
  { value: 'woensdag_5', label: 'Woensdag 5 strippen', quota: 6 },
  { value: 'zondag_5', label: 'Zondag 5 strippen', quota: 6 },
  { value: 'woensdag_10', label: 'Woensdag 10 strippen', quota: 11 },
  { value: 'zondag_10', label: 'Zondag 10 strippen', quota: 11 },
  { value: 'trainer', label: 'Trainer (geen strippen)', quota: 0 },
] as const;

type PackageKey = (typeof PACKAGE_OPTIONS)[number]['value'];

interface PlayerWithRoles {
  id: string;
  user_id: string;
  username: string;
  first_name: string;
  avatar_id: number | null;
  created_at: string | null;
  last_login_at: string | null;
  roles: AppRole[];
}

export default function AdminSpelersPage() {
  const { isTrainerOrAdmin, isAdmin, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingPlayer, setEditingPlayer] = useState<PlayerWithRoles | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([]);
  const [deletePlayer, setDeletePlayer] = useState<PlayerWithRoles | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [newPlayer, setNewPlayer] = useState({
    first_name: '',
    username: '',
    password: '',
    avatar_id: 1,
    package: 'woensdag_10' as PackageKey,
  });

  const createPlayerMutation = useMutation({
    mutationFn: async (payload: typeof newPlayer) => {
      const { data, error } = await supabase.functions.invoke('create-player', {
        body: payload,
      });
      if (error) {
        let message = (data as { error?: string } | null)?.error;
        // Read the real error message from the function response body
        const ctx = (error as unknown as { context?: Response }).context;
        if (!message && ctx && typeof ctx.json === 'function') {
          try {
            const body = await ctx.json();
            message = (body as { error?: string })?.error;
          } catch {
            // ignore parse errors
          }
        }
        throw new Error(message || error.message);
      }
      if ((data as { error?: string } | null)?.error) {
        throw new Error((data as { error: string }).error);
      }
      return data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-players'] });
      toast({ title: 'Speler aangemaakt', description: 'De speler kan nu inloggen.' });
      setIsCreateOpen(false);
      setNewPlayer({ first_name: '', username: '', password: '', avatar_id: 1, package: 'woensdag_10' });
    },
    onError: (error: Error) => {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    },
  });

  const handleCreatePlayer = () => {
    if (!newPlayer.first_name.trim() || !newPlayer.username.trim() || newPlayer.password.length < 6) {
      toast({
        title: 'Fout',
        description: 'Vul een naam, gebruikersnaam en wachtwoord (min. 6 tekens) in.',
        variant: 'destructive',
      });
      return;
    }
    createPlayerMutation.mutate(newPlayer);
  };



  // Fetch all profiles with their roles
  const { data: players, isLoading: playersLoading } = useQuery({
    queryKey: ['admin-players'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles for all users
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Map roles to profiles
      return profiles.map((profile) => ({
        ...profile,
        last_login_at: (profile as any).last_login_at,
        roles: roles
          .filter((r) => r.user_id === profile.user_id)
          .map((r) => r.role as AppRole),
      })) as PlayerWithRoles[];
    },
  });

  const sortedPlayers = useMemo(() => {
    if (!players) return [];
    if (!sortDirection) return players;
    return [...players].sort((a, b) => {
      const nameA = a.first_name.toLowerCase();
      const nameB = b.first_name.toLowerCase();
      if (nameA < nameB) return sortDirection === 'asc' ? -1 : 1;
      if (nameA > nameB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [players, sortDirection]);

  const toggleSort = () => {
    setSortDirection((prev) => {
      if (prev === 'asc') return 'desc';
      if (prev === 'desc') return null;
      return 'asc';
    });
  };

  const SortIcon = sortDirection === 'asc' ? ArrowUp : sortDirection === 'desc' ? ArrowDown : ArrowUpDown;

  // Update roles mutation
  const updateRolesMutation = useMutation({
    mutationFn: async ({ userId, newRoles }: { userId: string; newRoles: AppRole[] }) => {
      // Get current roles
      const { data: currentRoles, error: fetchError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (fetchError) throw fetchError;

      const currentRoleValues = currentRoles?.map((r) => r.role as AppRole) || [];

      // Roles to add
      const rolesToAdd = newRoles.filter((r) => !currentRoleValues.includes(r));
      // Roles to remove
      const rolesToRemove = currentRoleValues.filter((r) => !newRoles.includes(r));

      // Add new roles
      if (rolesToAdd.length > 0) {
        const { error: insertError } = await supabase.from('user_roles').insert(
          rolesToAdd.map((role) => ({ user_id: userId, role }))
        );
        if (insertError) throw insertError;
      }

      // Remove roles
      for (const role of rolesToRemove) {
        const { error: deleteError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', role);
        if (deleteError) throw deleteError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-players'] });
      toast({ title: 'Rollen bijgewerkt', description: 'De rollen zijn succesvol aangepast.' });
      setEditingPlayer(null);
    },
    onError: (error) => {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    },
  });

  // Delete player mutation
  const deletePlayerMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('delete-player', {
        body: { user_id: userId },
      });
      if (error) {
        let message = (data as { error?: string } | null)?.error;
        const ctx = (error as unknown as { context?: Response }).context;
        if (!message && ctx && typeof ctx.json === 'function') {
          try {
            const body = await ctx.json();
            message = (body as { error?: string })?.error;
          } catch {
            // ignore parse errors
          }
        }
        throw new Error(message || error.message);
      }
      if ((data as { error?: string } | null)?.error) {
        throw new Error((data as { error: string }).error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-players'] });
      toast({ title: 'Account verwijderd', description: 'Het account is succesvol verwijderd.' });
      setDeletePlayer(null);
    },
    onError: (error) => {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    },
  });

  const handleEditRoles = (player: PlayerWithRoles) => {
    setEditingPlayer(player);
    setSelectedRoles([...player.roles]);
  };

  const handleRoleToggle = (role: AppRole) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSaveRoles = () => {
    if (!editingPlayer) return;
    
    if (selectedRoles.length === 0) {
      toast({ title: 'Fout', description: 'Een speler moet minimaal één rol hebben.', variant: 'destructive' });
      return;
    }

    updateRolesMutation.mutate({
      userId: editingPlayer.user_id,
      newRoles: selectedRoles,
    });
  };

  const handleDeletePlayer = () => {
    if (!deletePlayer) return;
    deletePlayerMutation.mutate(deletePlayer.user_id);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return format(new Date(dateString), "d MMMM yyyy 'om' HH:mm", { locale: nl });
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800',
      trainer: 'bg-blue-100 text-blue-800',
      player: 'bg-green-100 text-green-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Admin',
      trainer: 'Trainer',
      player: 'Speler',
    };
    return labels[role] || role;
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
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Spelers Beheren</h1>
            <p className="text-muted-foreground">Overzicht van alle geregistreerde spelers</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Speler aanmaken</span>
          </Button>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nieuwe speler aanmaken</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="new-first-name">Voornaam</Label>
                <Input
                  id="new-first-name"
                  value={newPlayer.first_name}
                  onChange={(e) => setNewPlayer({ ...newPlayer, first_name: e.target.value })}
                  placeholder="Bijv. Sem"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-username">Gebruikersnaam</Label>
                <Input
                  id="new-username"
                  value={newPlayer.username}
                  onChange={(e) => setNewPlayer({ ...newPlayer, username: e.target.value.replace(/\s/g, '').toLowerCase() })}
                  placeholder="Bijv. sem10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Wachtwoord</Label>
                <Input
                  id="new-password"
                  type="text"
                  value={newPlayer.password}
                  onChange={(e) => setNewPlayer({ ...newPlayer, password: e.target.value })}
                  placeholder="Minimaal 6 tekens"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-package">Type / Strippenkaart</Label>
                <Select
                  value={newPlayer.package}
                  onValueChange={(v) => setNewPlayer({ ...newPlayer, package: v as PackageKey })}
                >
                  <SelectTrigger id="new-package">
                    <SelectValue placeholder="Kies een optie" />
                  </SelectTrigger>
                  <SelectContent>
                    {PACKAGE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {newPlayer.package !== 'trainer' && (
                  <p className="text-xs text-muted-foreground">
                    Inclusief 1 gratis proeftraining: {PACKAGE_OPTIONS.find((o) => o.value === newPlayer.package)?.quota} trainingen.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Kies een avatar</Label>
                <AvatarSelector
                  selectedId={newPlayer.avatar_id}
                  onSelect={(id) => setNewPlayer({ ...newPlayer, avatar_id: id })}
                />
              </div>
              <Button
                onClick={handleCreatePlayer}
                className="w-full"
                disabled={createPlayerMutation.isPending}
              >
                {createPlayerMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Speler aanmaken
              </Button>
            </div>
          </DialogContent>
        </Dialog>


        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Geregistreerde Spelers ({players?.length || 0})
              </span>
              <Button
                variant="outline"
                size="sm"
                className="md:hidden gap-2"
                onClick={toggleSort}
              >
                <SortIcon className="w-4 h-4" />
                Speler
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {playersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : players && players.length > 0 ? (
              <>
              {/* Mobile card view */}
              <div className="space-y-3 md:hidden">
                {players.map((player) => (
                  <div key={player.id} className="rounded-lg border border-border p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <AvatarDisplay avatarId={player.avatar_id || 1} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{player.first_name}</p>
                        <div className="flex gap-1 flex-wrap mt-1">
                          {player.roles.map((role) => (
                            <span
                              key={role}
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadge(role)}`}
                            >
                              {getRoleLabel(role)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Gebruikersnaam</span>
                        <span className="truncate">{player.username}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Aangemeld op</span>
                        <span className="text-right">{formatDate(player.created_at)}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Laatst ingelogd</span>
                        <span className="text-right">{formatDate(player.last_login_at)}</span>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 gap-2"
                              onClick={() => handleEditRoles(player)}
                            >
                              <Settings2 className="w-4 h-4" />
                              Rollen
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Rollen beheren voor {player.first_name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                              <p className="text-sm text-muted-foreground">
                                Selecteer de rollen die je wilt toewijzen aan deze gebruiker.
                              </p>
                              <div className="space-y-3">
                                {ALL_ROLES.map((role) => (
                                  <div key={role.value} className="flex items-center space-x-3">
                                    <Checkbox
                                      id={`m-role-${player.id}-${role.value}`}
                                      checked={selectedRoles.includes(role.value)}
                                      onCheckedChange={() => handleRoleToggle(role.value)}
                                    />
                                    <Label
                                      htmlFor={`m-role-${player.id}-${role.value}`}
                                      className="text-sm font-medium cursor-pointer"
                                    >
                                      {role.label}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                              <Button
                                onClick={handleSaveRoles}
                                className="w-full"
                                disabled={updateRolesMutation.isPending}
                              >
                                {updateRolesMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : null}
                                Opslaan
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 text-destructive hover:text-destructive"
                          onClick={() => setDeletePlayer(player)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto">

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Speler</TableHead>
                      <TableHead>Gebruikersnaam</TableHead>
                      <TableHead>Rol(len)</TableHead>
                      <TableHead>Aangemeld op</TableHead>
                      <TableHead>Laatst ingelogd</TableHead>
                      {isAdmin && <TableHead className="text-right">Acties</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {players.map((player) => (
                      <TableRow key={player.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <AvatarDisplay avatarId={player.avatar_id || 1} size="sm" />
                            <span className="font-medium">{player.first_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{player.username}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {player.roles.map((role) => (
                              <span
                                key={role}
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadge(role)}`}
                              >
                                {getRoleLabel(role)}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(player.created_at)}</TableCell>
                        <TableCell>{formatDate(player.last_login_at)}</TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditRoles(player)}
                                  >
                                    <Settings2 className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Rollen beheren voor {player.first_name}</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4 mt-4">
                                    <p className="text-sm text-muted-foreground">
                                      Selecteer de rollen die je wilt toewijzen aan deze gebruiker.
                                    </p>
                                    <div className="space-y-3">
                                      {ALL_ROLES.map((role) => (
                                        <div key={role.value} className="flex items-center space-x-3">
                                          <Checkbox
                                            id={`role-${role.value}`}
                                            checked={selectedRoles.includes(role.value)}
                                            onCheckedChange={() => handleRoleToggle(role.value)}
                                          />
                                          <Label
                                            htmlFor={`role-${role.value}`}
                                            className="text-sm font-medium cursor-pointer"
                                          >
                                            {role.label}
                                          </Label>
                                        </div>
                                      ))}
                                    </div>
                                    <Button
                                      onClick={handleSaveRoles}
                                      className="w-full"
                                      disabled={updateRolesMutation.isPending}
                                    >
                                      {updateRolesMutation.isPending ? (
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                      ) : null}
                                      Opslaan
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeletePlayer(player)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              </>

            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nog geen spelers geregistreerd.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deletePlayer} onOpenChange={(open) => !open && setDeletePlayer(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Account verwijderen</AlertDialogTitle>
              <AlertDialogDescription>
                Weet je zeker dat je het account van <strong>{deletePlayer?.first_name}</strong> wilt verwijderen? 
                Dit kan niet ongedaan worden gemaakt.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuleren</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeletePlayer}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deletePlayerMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Verwijderen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
