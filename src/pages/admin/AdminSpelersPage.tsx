import { useState } from 'react';
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
import { AvatarSelector } from '@/components/AvatarSelector';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Users, Settings2, Trash2, Plus } from 'lucide-react';

const ALL_ROLES = [
  { value: 'player', label: 'Speler' },
  { value: 'trainer', label: 'Trainer' },
  { value: 'admin', label: 'Admin' },
] as const;

type AppRole = 'player' | 'trainer' | 'admin';

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
      // Delete from user_roles first
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      
      if (rolesError) throw rolesError;

      // Delete from profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (profileError) throw profileError;
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
          <div>
            <h1 className="text-2xl font-bold">Spelers Beheren</h1>
            <p className="text-muted-foreground">Overzicht van alle geregistreerde spelers</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Geregistreerde Spelers ({players?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {playersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : players && players.length > 0 ? (
              <div className="overflow-x-auto">
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
