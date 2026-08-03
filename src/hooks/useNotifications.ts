import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type NotificationType = 'new_player' | 'session_signup' | 'suggestion' | null;

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  related_id: string | null;
  read_at: string | null;
  created_at: string | null;
  is_broadcast: boolean | null;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    const rows = (data || []) as AppNotification[];
    setNotifications(rows);
    setUnreadCount(rows.filter((n) => !n.read_at).length);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = useCallback(
    async (id: string) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id)
        .is('read_at', null);
    },
    []
  );

  const markAllAsRead = useCallback(async () => {
    const ids = notifications.filter((n) => !n.read_at).map((n) => n.id);
    if (ids.length === 0) return;
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .in('id', ids);
    await fetchNotifications();
  }, [notifications, fetchNotifications]);

  return { notifications, unreadCount, isLoading, fetchNotifications, markAsRead, markAllAsRead };
}
