import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Users, Calendar, Trophy, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminPage() {
  const { isTrainerOrAdmin, isLoading } = useAuth();

  if (isLoading) {
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

  const adminCards = [
    { icon: Calendar, title: 'Trainingen beheren', description: 'Maak en bewerk trainingen', to: '/admin/trainingen' },
    { icon: Users, title: 'Spelers beheren', description: 'Bekijk en bewerk spelers', to: '/admin/spelers' },
    { icon: Trophy, title: 'Statistieken Invoeren', description: 'Voer aanwezigheid en stats in', to: '/admin/stats' },
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <Settings className="w-12 h-12 text-primary mx-auto mb-2" />
          <h1 className="text-3xl font-bold">Beheerdersdashboard</h1>
          <p className="text-muted-foreground">Beheer trainingen, spelers en statistieken</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {adminCards.map((card) => (
            <Link key={card.to} to={card.to}>
              <Card className="hover-lift h-full">
                <CardHeader>
                  <card.icon className="w-10 h-10 text-primary mb-2" />
                  <CardTitle>{card.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{card.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
