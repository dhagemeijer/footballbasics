import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AvatarSelector } from '@/components/AvatarSelector';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus } from 'lucide-react';
import { Layout } from '@/components/Layout';

export default function SignupPage() {
  const [step, setStep] = useState<'info' | 'avatar'>('info');
  const [firstName, setFirstName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarId, setAvatarId] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName.trim()) {
      toast({
        title: 'Fout',
        description: 'Vul je voornaam in.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Fout',
        description: 'Je wachtwoord moet minimaal 6 tekens bevatten.',
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Fout',
        description: 'De wachtwoorden komen niet overeen.',
        variant: 'destructive',
      });
      return;
    }

    setStep('avatar');
  };

  const handleAvatarSubmit = async () => {
    setIsLoading(true);
    
    // Generate a unique username from first name
    const username = `${firstName.toLowerCase().replace(/\s+/g, '')}${Date.now().toString().slice(-4)}`;
    
    const { error } = await signUp(username, password, firstName.trim(), avatarId);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Aanmelden mislukt',
        description: error.message || 'Er is iets misgegaan. Probeer het opnieuw.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Welkom bij Football Basics! 🎉',
        description: 'Je account is aangemaakt.',
      });
      navigate('/');
    }
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <Card className="w-full max-w-md animate-scale-in">
          <CardHeader className="text-center">
            <div className="text-6xl mb-4">🌟</div>
            <CardTitle className="text-2xl">
              {step === 'info' ? 'Word lid van de academie!' : 'Kies je avatar!'}
            </CardTitle>
            <CardDescription>
              {step === 'info' 
                ? 'Vul je gegevens in om je aan te melden.'
                : 'Kies een leuke avatar die bij je past!'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'info' ? (
              <form onSubmit={handleInfoSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Voornaam</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Jouw voornaam"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="text-lg py-6"
                    autoComplete="given-name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Wachtwoord</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimaal 6 tekens"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="text-lg py-6"
                    autoComplete="new-password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Bevestig wachtwoord</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Herhaal je wachtwoord"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="text-lg py-6"
                    autoComplete="new-password"
                  />
                </div>

                <Button type="submit" className="w-full py-6 text-lg font-bold">
                  Volgende: Kies Avatar →
                </Button>
              </form>
            ) : (
              <div className="space-y-6">
                <AvatarSelector
                  selectedId={avatarId}
                  onSelect={setAvatarId}
                />
                
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 py-6"
                    onClick={() => setStep('info')}
                    disabled={isLoading}
                  >
                    ← Terug
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 py-6 text-lg font-bold"
                    onClick={handleAvatarSubmit}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <UserPlus className="w-5 h-5 mr-2" />
                    )}
                    Aanmelden!
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                Al een account?{' '}
                <Link to="/inloggen" className="text-primary font-semibold hover:underline">
                  Log in!
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
