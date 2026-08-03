import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNotifications, type AppNotification } from '@/hooks/useNotifications';
import { useSuggestions } from '@/hooks/useSuggestions';
import { SuggestionDetailDialog } from '@/components/admin/SuggestionDetailDialog';
import type { Suggestion } from '@/hooks/useSuggestions';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Bell, UserPlus, CalendarCheck, Lightbulb, Loader2, CheckCheck, ArrowLeft } from 'lucide-react';

const TYPE_META: Record<string, { icon: typeof Bell; label: string; className: string }> = {
  new_player: { icon: UserPlus, label: 'Nieuwe speler', className: 'bg-blue-500 text-white' },
  session_signup: { icon: CalendarCheck, label: 'Inschrijving', className: 'bg-success text-success-foreground' },
  suggestion: { icon: Lightbulb, label: 'Suggestie', className: 'bg-primary text-primary-foreground' },
};

export default function AdminMeldingenPage() {
  const { isTrainerOrAdmin, isLoading: authLoading } = useAuth();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const { suggestions, updateSuggestionStatus, fetchSuggestions } = useSuggestions();
  const [activeSuggestion, setActiveSuggestion] = useState<Suggestion | null>(null);

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

  const handleClick = async (n: AppNotification) => {
    if (!n.read_at) await markAsRead(n.id);
    if (n.type === 'suggestion' && n.related_id) {
      const match = suggestions.find((s) => s.id === n.related_id);
      if (match) setActiveSuggestion(match);
    }
  };

  const handleStatusUpdate = async (id: string, status: 'approved' | 'rejected') => {
    const res = await updateSuggestionStatus(id, status);
    if (!res.error) await fetchSuggestions();
    return res;
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Button variant="ghost" size="sm" asChild className="mb-4 gap-2">
            <Link to="/admin">
              <ArrowLeft className="w-4 h-4" />
              Terug naar beheer
            </Link>
          </Button>

          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <Bell className="w-7 h-7 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Meldingen</h1>
                <p className="text-sm text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} ongelezen` : 'Alles gelezen'}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-2">
                <CheckCheck className="w-4 h-4" />
                Alles gelezen
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : notifications.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Er zijn nog geen meldingen.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => {
                const meta = TYPE_META[n.type || ''] || {
                  icon: Bell,
                  label: 'Melding',
                  className: 'bg-secondary text-secondary-foreground',
                };
                const Icon = meta.icon;
                const unread = !n.read_at;
                const suggestion =
                  n.type === 'suggestion' && n.related_id
                    ? suggestions.find((s) => s.id === n.related_id)
                    : undefined;

                return (
                  <Card
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`cursor-pointer transition-colors ${
                      unread ? 'border-primary bg-accent' : 'opacity-80'
                    }`}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-start gap-3">
                        <div className={`rounded-full p-2 ${meta.className}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">{meta.label}</Badge>
                            {unread && <Badge className="bg-primary text-primary-foreground">Nieuw</Badge>}
                            {suggestion && suggestion.status !== 'pending' && (
                              <Badge variant={suggestion.status === 'approved' ? 'default' : 'destructive'}>
                                {suggestion.status === 'approved' ? 'Geaccepteerd' : 'Afgekeurd'}
                              </Badge>
                            )}
                          </div>
                          <p className={`mt-1 ${unread ? 'font-bold' : 'font-medium'}`}>{n.title}</p>
                          {suggestion && suggestion.options.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {suggestion.options.map((opt) => (
                                <Badge key={opt} variant="outline">
                                  {opt}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground break-words">{n.message}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {n.created_at
                              ? format(new Date(n.created_at), "d MMMM yyyy 'om' HH:mm", { locale: nl })
                              : ''}
                          </p>

                          {suggestion && suggestion.status === 'pending' && (
                            <Button
                              size="sm"
                              className="mt-3"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!n.read_at) markAsRead(n.id);
                                setActiveSuggestion(suggestion);
                              }}
                            >
                              Beoordelen
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <SuggestionDetailDialog
        suggestion={activeSuggestion}
        open={!!activeSuggestion}
        onOpenChange={(open) => !open && setActiveSuggestion(null)}
        onStatusUpdate={handleStatusUpdate}
      />
    </Layout>
  );
}
