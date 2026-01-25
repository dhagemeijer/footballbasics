import { cn } from '@/lib/utils';
import { avatars, Avatar } from '@/lib/avatars';

interface AvatarSelectorProps {
  selectedId: number;
  onSelect: (id: number) => void;
  className?: string;
}

export function AvatarSelector({ selectedId, onSelect, className }: AvatarSelectorProps) {
  return (
    <div className={cn('grid grid-cols-5 gap-3', className)}>
      {avatars.map((avatar) => (
        <button
          key={avatar.id}
          type="button"
          onClick={() => onSelect(avatar.id)}
          className={cn(
            'w-14 h-14 rounded-xl flex items-center justify-center text-2xl transition-all duration-200',
            'hover:scale-110 hover:shadow-lg',
            selectedId === avatar.id
              ? 'ring-4 ring-primary shadow-lg scale-105'
              : 'ring-2 ring-border hover:ring-primary/50'
          )}
          style={{ backgroundColor: avatar.color + '30' }}
        >
          <span role="img" aria-label={avatar.name}>
            {avatar.emoji}
          </span>
        </button>
      ))}
    </div>
  );
}
