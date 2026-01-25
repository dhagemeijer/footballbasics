import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { AvatarSelector } from '@/components/AvatarSelector';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Eye, EyeOff, Trophy, Target, Zap } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export default function ProfilePage() {
  const { user, profile, refreshProfile, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [avatarId, setAvatarId] = useState(1);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name);
      setAvatarId(profile.avatar_id);
    }
  }, [profile]);

  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return <Navigate to="/inloggen" replace />;
  }

  const handleSaveProfile = async () => {
    if (!profile) return;

    setIsSaving(true);

    // Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        first_name: firstName,
        avatar_id: avatarId,
      })
      .eq('id', profile.id);

    if (profileError) {
      toast({
        title: 'Fout',
        description: 'Kon je profiel niet opslaan.',
        variant: 'destructive',
      });
      setIsSaving(false);
      return;
    }

    // Update password if provided
    if (newPassword) {
      if (newPassword.length < 6) {
        toast({
          title: 'Fout',
          description: 'Wachtwoord moet minimaal 6 tekens bevatten.',
          variant: 'destructive',
        });
        setIsSaving(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        toast({
          title: 'Fout',
          description: 'Wachtwoorden komen niet overeen.',
          variant: 'destructive',
        });
        setIsSaving(false);
        return;
      }

      const { error: passwordError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (passwordError) {
        toast({
          title: 'Fout',
          description: 'Kon wachtwoord niet wijzigen.',
          variant: 'destructive',
        });
        setIsSaving(false);
        return;
      }
    }

    await refreshProfile();
    setNewPassword('');
    setConfirmPassword('');
    setIsEditing(false);
    setIsSaving(false);

    toast({
      title: 'Opgeslagen! ✅',
      description: 'Je profiel is bijgewerkt.',
    });
  };

  const stats = [
    { icon: Trophy, label: 'Trainingen', value: profile?.sessions_attended || 0, unit: '' },
    { icon: Target, label: 'Lat-raak', value: profile?.crossbars_hit || 0, unit: 'x' },
    { icon: Zap, label: 'Snelste sprint', value: profile?.running_speed || 0, unit: ' km/h' },
    { icon: Zap, label: 'Hardste schot', value: profile?.shooting_speed || 0, unit: ' km/h' },
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Profile Header */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <AvatarDisplay avatarId={profile?.avatar_id || 1} size="xl" />
                <h1 className="text-2xl font-bold mt-4">{profile?.first_name}</h1>
                <p className="text-muted-foreground">@{profile?.username}</p>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                Mijn Statistieken
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {stats.map((stat, i) => (
                  <div key={i} className="bg-secondary/50 rounded-lg p-4 text-center">
                    <stat.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                    <div className="text-2xl font-bold">
                      {stat.value}{stat.unit}
                    </div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Edit Profile */}
          <Card>
            <CardHeader>
              <CardTitle>Profiel Bewerken</CardTitle>
              <CardDescription>
                Pas je naam, avatar of wachtwoord aan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isEditing ? (
                <>
                  <div className="space-y-2">
                    <Label>Voornaam</Label>
                    <Input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Jouw voornaam"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Avatar</Label>
                    <AvatarSelector selectedId={avatarId} onSelect={setAvatarId} />
                  </div>

                  <div className="border-t border-border pt-4 space-y-4">
                    <Label className="text-base font-medium">Wachtwoord wijzigen (optioneel)</Label>
                    
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Nieuw wachtwoord</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Minimaal 6 tekens"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Bevestig wachtwoord</Label>
                      <Input
                        id="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Herhaal wachtwoord"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setFirstName(profile?.first_name || '');
                        setAvatarId(profile?.avatar_id || 1);
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                      disabled={isSaving}
                    >
                      Annuleren
                    </Button>
                    <Button onClick={handleSaveProfile} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Opslaan
                    </Button>
                  </div>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)} variant="outline" className="w-full">
                  Profiel bewerken
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
