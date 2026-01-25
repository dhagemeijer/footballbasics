import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Suggestion {
  id: string;
  suggestion: string;
  created_at: string;
  user_id: string;
  session_id: string | null;
  status: 'pending' | 'approved' | 'rejected';
  read_at: string | null;
  profile?: { first_name: string; avatar_id: number | null } | null;
  session?: { title: string; session_date: string } | null;
}

export function useSuggestions() {
  const { user, isTrainerOrAdmin } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSuggestions = async () => {
    const { data: suggestionsData } = await supabase
      .from('training_focus_suggestions')
      .select('*')
      .order('created_at', { ascending: false });

    if (suggestionsData && suggestionsData.length > 0) {
      const userIds = [...new Set(suggestionsData.map(s => s.user_id))];
      const sessionIds = [...new Set(suggestionsData.map(s => s.session_id).filter(Boolean))];

      const [profilesRes, sessionsRes] = await Promise.all([
        supabase.from('profiles').select('user_id, first_name, avatar_id').in('user_id', userIds),
        sessionIds.length > 0 
          ? supabase.from('training_sessions').select('id, title, session_date').in('id', sessionIds as string[])
          : { data: [] as { id: string; title: string; session_date: string }[] }
      ]);

      const profilesMap = new Map<string, { user_id: string; first_name: string; avatar_id: number | null }>(
        profilesRes.data?.map(p => [p.user_id, p]) || []
      );
      const sessionsMap = new Map<string, { id: string; title: string; session_date: string }>(
        sessionsRes.data?.map(s => [s.id, s]) || []
      );

      const enriched: Suggestion[] = suggestionsData.map(s => ({
        id: s.id,
        suggestion: s.suggestion,
        created_at: s.created_at || '',
        user_id: s.user_id,
        session_id: s.session_id,
        status: (s.status || 'pending') as 'pending' | 'approved' | 'rejected',
        read_at: s.read_at,
        profile: profilesMap.get(s.user_id) || null,
        session: s.session_id ? sessionsMap.get(s.session_id) || null : null
      }));
      
      setSuggestions(enriched);
      setUnreadCount(enriched.filter(s => !s.read_at && s.status === 'pending').length);
    } else {
      setSuggestions([]);
      setUnreadCount(0);
    }
    setIsLoading(false);
  };

  const markAsRead = async (suggestionId: string) => {
    await supabase
      .from('training_focus_suggestions')
      .update({ read_at: new Date().toISOString() })
      .eq('id', suggestionId);
    
    await fetchSuggestions();
  };

  const updateSuggestionStatus = async (suggestionId: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase
      .from('training_focus_suggestions')
      .update({ status, read_at: new Date().toISOString() })
      .eq('id', suggestionId);
    
    if (!error) {
      await fetchSuggestions();
    }
    return { error };
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  return {
    suggestions,
    unreadCount,
    isLoading,
    fetchSuggestions,
    markAsRead,
    updateSuggestionStatus
  };
}
