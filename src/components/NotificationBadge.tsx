import { useSuggestions } from '@/hooks/useSuggestions';
import { useAuth } from '@/contexts/AuthContext';

export function NotificationBadge() {
  const { isTrainerOrAdmin } = useAuth();
  const { unreadCount } = useSuggestions();

  if (!isTrainerOrAdmin || unreadCount === 0) {
    return null;
  }

  return (
    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  );
}
