export const FOCUS_OPTIONS = [
  'Aanvallen',
  'Verdedigen',
  'Scoren',
  'Passen',
  'Dribbelen',
  'Positiespel',
] as const;

export type FocusOption = (typeof FOCUS_OPTIONS)[number];
