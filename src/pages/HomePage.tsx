import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { 
  Calendar, 
  Trophy, 
  Users, 
  Zap, 
  Target,
  ArrowRight,
  Sparkles,
  Medal
} from 'lucide-react';

export default function HomePage() {
  const { user, profile, isLoading } = useAuth();

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
            <div className="inline-flex items-center gap-2 bg-primary/20 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6 animate-fade-in">
              <Sparkles className="w-4 h-4" />
              <span>Jeugd Voetbal Academie</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-slide-in-up">
              Welkom bij{' '}
              <span className="text-gradient">Football Basics</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 animate-slide-in-up stagger-1">
              Leer voetballen, maak vrienden en word de beste speler die je kunt zijn!
              Voor kinderen van 7-12 jaar.
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
        <h2 className="text-3xl font-bold text-center mb-12">
          Wat kun je bij ons doen?
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
      <section className="bg-card py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <StatCard icon="⚽" value="100+" label="Spelers" />
            <StatCard icon="🏃" value="50+" label="Trainingen" />
            <StatCard icon="🏆" value="4" label="Trainers" />
            <StatCard icon="⭐" value="5/5" label="Beoordeling" />
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
            <span className="text-2xl">⚽</span>
            <span>Football Basics © 2024 - Jeugd Voetbal Academie</span>
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

function StatCard({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="animate-fade-in">
      <div className="text-4xl mb-2">{icon}</div>
      <div className="text-3xl font-bold text-primary">{value}</div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  );
}
