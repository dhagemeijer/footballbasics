// Football-themed cartoon avatars for kids
// 20 colorful, kid-friendly options

export interface Avatar {
  id: number;
  emoji: string;
  name: string;
  color: string;
}

export const avatars: Avatar[] = [
  { id: 1, emoji: '⚽', name: 'Voetbal', color: '#FFD93D' },
  { id: 2, emoji: '🥅', name: 'Doel', color: '#6BCB77' },
  { id: 3, emoji: '👟', name: 'Voetbalschoen', color: '#4D96FF' },
  { id: 4, emoji: '🏆', name: 'Trofee', color: '#FFD93D' },
  { id: 5, emoji: '⭐', name: 'Ster', color: '#FF6B6B' },
  { id: 6, emoji: '🦁', name: 'Leeuw', color: '#FF9F43' },
  { id: 7, emoji: '🐯', name: 'Tijger', color: '#FF9F43' },
  { id: 8, emoji: '🦅', name: 'Adelaar', color: '#5F27CD' },
  { id: 9, emoji: '🐺', name: 'Wolf', color: '#576574' },
  { id: 10, emoji: '🔥', name: 'Vuur', color: '#FF6B6B' },
  { id: 11, emoji: '⚡', name: 'Bliksem', color: '#FFD93D' },
  { id: 12, emoji: '🚀', name: 'Raket', color: '#4D96FF' },
  { id: 13, emoji: '🎯', name: 'Doel', color: '#EE5A24' },
  { id: 14, emoji: '💪', name: 'Sterk', color: '#FF6B6B' },
  { id: 15, emoji: '👑', name: 'Koning', color: '#FFD93D' },
  { id: 16, emoji: '🌟', name: 'Glitter', color: '#F8B739' },
  { id: 17, emoji: '🎖️', name: 'Medaille', color: '#6BCB77' },
  { id: 18, emoji: '🐉', name: 'Draak', color: '#5F27CD' },
  { id: 19, emoji: '🦈', name: 'Haai', color: '#4D96FF' },
  { id: 20, emoji: '🏅', name: 'Kampioen', color: '#FFD93D' },
];

export function getAvatar(id: number): Avatar {
  return avatars.find(a => a.id === id) || avatars[0];
}
