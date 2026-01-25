import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { supabase } from '@/integrations/supabase/client';
import fbTextLogo from '@/assets/fb_app_tekstlogo.png';
import logo from '@/assets/logo.png';
import goalIcon from '@/assets/goal-icon.png';
import playerIcon from '@/assets/player-icon.png';
import footballIcon from '@/assets/football-icon.png';
import { 
  Calendar, 
  Trophy, 
  Zap, 
  Target,
  ArrowRight,
  Medal
} from 'lucide-react';

interface HomeStats {
  totalPlayerSessions: number;
  totalTrainings: number;
  totalCrossbars: number;
}

export default function HomePage() {
  const { user, profile, isLoading } = useAuth();
  const [stats, setStats] = useState<HomeStats>({
    totalPlayerSessions: 0,
    totalTrainings: 0,
    totalCrossbars: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    // Fetch total sessions attended by players
    const { data: playerRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'player');

    const playerIds = (playerRoles || []).map(r => r.user_id);
    
    let totalPlayerSessions = 0;
    let totalCrossbars = 0;
    
    if (playerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('sessions_attended, crossbars_hit, user_id');
      
      (profiles || []).forEach(p => {
        if (playerIds.includes(p.user_id)) {
          totalPlayerSessions += p.sessions_attended || 0;
        }
        totalCrossbars += p.crossbars_hit || 0;
      });
    } else {
      // If no explicit player roles, count all profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('sessions_attended, crossbars_hit');
      
      (profiles || []).forEach(p => {
        totalPlayerSessions += p.sessions_attended || 0;
        totalCrossbars += p.crossbars_hit || 0;
      });
    }

    // Fetch total training sessions
    const { count: trainingCount } = await supabase
      .from('training_sessions')
      .select('*', { count: 'exact', head: true });

    setStats({
      totalPlayerSessions,
      totalTrainings: trainingCount || 0,
      totalCrossbars,
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl animate-bounce-in mb-4">⚽</div>
            <p className="text-muted-foreground">Laden...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent" />
        <div className="container mx-auto px-4 py-16 md:py-24 relative">
          <div className="max-w-3xl mx-auto text-center">
            <img 
              src={fbTextLogo} 
              alt="Football Basics - more skills, more fun" 
              className="h-24 md:h-32 mx-auto mb-8 animate-fade-in"
            />
            
            <p className="text-lg md:text-xl text-white mb-8 animate-slide-in-up stagger-1">
              Bij ons wordt voetbal echt leuk!
            </p>

            {user && profile ? (
              <div className="flex flex-col items-center gap-6 animate-slide-in-up stagger-2">
                <div className="flex items-center gap-4 bg-card p-4 rounded-2xl">
                  <AvatarDisplay avatarId={profile.avatar_id} size="lg" />
                  <div className="text-left">
                    <p className="text-sm text-muted-foreground">Welkom terug,</p>
                    <p className="text-2xl font-bold">{profile.first_name}!</p>
                  </div>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  <Link to="/trainingen">
                    <Button size="lg" className="gap-2">
                      <Calendar className="w-5 h-5" />
                      Bekijk Trainingen
                    </Button>
                  </Link>
                  <Link to="/ranglijst">
                    <Button size="lg" variant="secondary" className="gap-2">
                      <Trophy className="w-5 h-5" />
                      Ranglijst
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-4 animate-slide-in-up stagger-2">
                <Link to="/aanmelden">
                  <Button size="lg" className="gap-2 text-lg px-8 py-6">
                    <Zap className="w-5 h-5" />
                    Word lid!
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/inloggen">
                  <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                    Inloggen
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-white">
          Wat kan je in de app doen?
        </h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard
            icon={Calendar}
            title="Trainingen"
            description="Schrijf je in voor leuke trainingen en oefen met je teamgenoten!"
            delay="stagger-1"
          />
          <FeatureCard
            icon={Target}
            title="Statistieken"
            description="Houd je prestaties bij: doelpunten, snelheid, en meer!"
            delay="stagger-2"
          />
          <FeatureCard
            icon={Trophy}
            title="Ranglijst"
            description="Bekijk hoe je het doet vergeleken met andere spelers!"
            delay="stagger-3"
          />
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-black py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-3 gap-6 text-center max-w-2xl mx-auto">
            <StatCard icon={<img src={playerIcon} alt="Spelers" className="h-10 w-10 mx-auto" />} value={stats.totalPlayerSessions.toString()} label="Spelers" />
            <StatCard icon={<img src={footballIcon} alt="Trainingen" className="h-10 w-10 mx-auto" />} value={stats.totalTrainings.toString()} label="Trainingen" />
            <StatCard icon={<img src={goalIcon} alt="Latjes" className="h-10 w-10 mx-auto" />} value={stats.totalCrossbars.toString()} label="Latjes" />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="container mx-auto px-4 py-16">
          <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
            <CardContent className="p-8 md:p-12 text-center">
              <Medal className="w-16 h-16 text-primary mx-auto mb-6" />
              <h2 className="text-3xl font-bold mb-4">
                Klaar om te beginnen?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Meld je vandaag nog aan en begin met trainen bij Football Basics!
              </p>
              <Link to="/aanmelden">
                <Button size="lg" className="gap-2 text-lg px-8 py-6">
                  <Zap className="w-5 h-5" />
                  Meld je nu aan!
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p className="flex items-center justify-center gap-2">
            <img src={logo} alt="Football Basics" className="h-8 w-8" />
            <span>© 2026 | Football Basics - More skills, more fun</span>
          </p>
        </div>
      </footer>
    </Layout>
  );
}

function FeatureCard({ 
  icon: Icon, 
  title, 
  description, 
  delay 
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  title: string; 
  description: string;
  delay: string;
}) {
  return (
    <Card className={`hover-lift animate-slide-in-up ${delay}`}>
      <CardHeader>
        <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-primary" />
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-base">{description}</CardDescription>
      </CardContent>
    </Card>
  );
}

function StatCard({ icon, value, label }: { icon: string | React.ReactNode; value: string; label: string }) {
  return (
    <div className="animate-fade-in">
      <div className="text-4xl mb-2 flex justify-center">
        {typeof icon === 'string' ? icon : icon}
      </div>
      <div className="text-3xl font-bold text-primary">{value}</div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  );
}
