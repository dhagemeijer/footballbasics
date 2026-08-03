import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogIn } from 'lucide-react';
import { Layout } from '@/components/Layout';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextParam = searchParams.get('next');
  const redirectTo = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/';
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password) {
      toast({
        title: 'Fout',
        description: 'Vul je gebruikersnaam en wachtwoord in.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(username.trim(), password);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Inloggen mislukt',
        description: 'Controleer je gebruikersnaam en wachtwoord.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Welkom terug! ⚽',
        description: 'Je bent succesvol ingelogd.',
      });
      navigate(redirectTo);
    }
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <Card className="w-full max-w-md animate-scale-in">
          <CardHeader className="text-center">
            <div className="text-6xl mb-4">⚽</div>
            <CardTitle className="text-2xl">Inloggen</CardTitle>
            <CardDescription>
              Welkom terug bij Football Basics!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Gebruikersnaam</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Jouw naam"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="text-lg py-6"
                  autoComplete="username"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Wachtwoord</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="text-lg py-6"
                  autoComplete="current-password"
                />
              </div>

              <Button
                type="submit"
                className="w-full py-6 text-lg font-bold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <LogIn className="w-5 h-5 mr-2" />
                )}
                Inloggen
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                Nog geen account?{' '}
                <Link to="/aanmelden" className="text-primary font-semibold hover:underline">
                  Meld je aan!
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
