import { useQuery } from '@tanstack/react-query';
import { Navigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { Loader2, ArrowLeft, Users } from 'lucide-react';

export default function AdminSpelersPage() {
  const { isTrainerOrAdmin, isLoading: authLoading } = useAuth();

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
        roles: roles
          .filter((r) => r.user_id === profile.user_id)
          .map((r) => r.role),
      }));
    },
  });

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
                            {player.roles.map((role: string) => (
                              <span
                                key={role}
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadge(role)}`}
                              >
                                {role}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(player.created_at)}</TableCell>
                        <TableCell>{formatDate((player as any).last_login_at)}</TableCell>
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
      </div>
    </Layout>
  );
}
