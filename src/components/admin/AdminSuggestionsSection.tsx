import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { Lightbulb, MessageCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { SuggestionDetailDialog } from './SuggestionDetailDialog';
import { useSuggestions, type Suggestion } from '@/hooks/useSuggestions';

export function AdminSuggestionsSection() {
  const { suggestions, unreadCount, updateSuggestionStatus, markAsRead } = useSuggestions();
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSuggestionClick = async (suggestion: Suggestion) => {
    if (!suggestion.read_at) {
      await markAsRead(suggestion.id);
    }
    setSelectedSuggestion(suggestion);
    setDialogOpen(true);
  };

  const pendingCount = suggestions.filter(s => s.status === 'pending').length;
  const approvedCount = suggestions.filter(s => s.status === 'approved').length;
  const rejectedCount = suggestions.filter(s => s.status === 'rejected').length;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            Suggesties
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} nieuw
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-secondary/50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-amber-500">
                <Clock className="w-4 h-4" />
                <span className="font-bold">{pendingCount}</span>
              </div>
              <p className="text-xs text-muted-foreground">In afwachting</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-green-500">
                <CheckCircle className="w-4 h-4" />
                <span className="font-bold">{approvedCount}</span>
              </div>
              <p className="text-xs text-muted-foreground">Geaccepteerd</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-destructive">
                <XCircle className="w-4 h-4" />
                <span className="font-bold">{rejectedCount}</span>
              </div>
              <p className="text-xs text-muted-foreground">Afgekeurd</p>
            </div>
          </div>

          {/* Suggestions list */}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {suggestions.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Geen suggesties ontvangen
              </p>
            ) : (
              suggestions.slice(0, 5).map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors hover:bg-secondary/50 ${
                    !suggestion.read_at && suggestion.status === 'pending' 
                      ? 'bg-primary/5 border-primary/20' 
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <AvatarDisplay avatarId={suggestion.profile?.avatar_id || 1} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {suggestion.profile?.first_name || 'Speler'}
                        </span>
                        {!suggestion.read_at && suggestion.status === 'pending' && (
                          <Badge variant="secondary" className="text-xs">Nieuw</Badge>
                        )}
                        {suggestion.status === 'approved' && (
                          <Badge className="bg-green-500 text-xs">Geaccepteerd</Badge>
                        )}
                        {suggestion.status === 'rejected' && (
                          <Badge variant="destructive" className="text-xs">Afgekeurd</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {suggestion.suggestion}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(suggestion.created_at), 'd MMM', { locale: nl })}
                        {suggestion.session && ` • ${suggestion.session.title}`}
                      </p>
                    </div>
                    <MessageCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <SuggestionDetailDialog
        suggestion={selectedSuggestion}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onStatusUpdate={updateSuggestionStatus}
      />
    </>
  );
}
