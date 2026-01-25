import { cn } from '@/lib/utils';
import { getAvatar } from '@/lib/avatars';

interface AvatarDisplayProps {
  avatarId: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBorder?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-lg',
  md: 'w-12 h-12 text-2xl',
  lg: 'w-16 h-16 text-3xl',
  xl: 'w-24 h-24 text-5xl',
};

export function AvatarDisplay({ avatarId, size = 'md', className, showBorder = true }: AvatarDisplayProps) {
  const avatar = getAvatar(avatarId);
  
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center transition-all duration-300',
        showBorder && 'ring-2 ring-primary/50',
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: avatar.color + '30' }}
    >
      <span role="img" aria-label={avatar.name}>
        {avatar.emoji}
      </span>
    </div>
  );
}
