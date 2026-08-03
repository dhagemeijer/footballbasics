import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FOCUS_OPTIONS } from '@/lib/trainingFocus';
import { Loader2, BarChart3 } from 'lucide-react';

interface Props {
  sessionId: string;
  /** bump to refetch */
  refreshKey?: number;
  compact?: boolean;
}

export function SessionVoteResults({ sessionId, refreshKey = 0, compact }: Props) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    supabase
      .rpc('get_session_option_votes', { _session_id: sessionId })
      .then(({ data }) => {
        if (!active) return;
        const map: Record<string, number> = {};
        (data || []).forEach((row: { option: string; votes: number }) => {
          map[row.option] = Number(row.votes);
        });
        setCounts(map);
        setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sessionId, refreshKey]);

  if (isLoading) {
    return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
  }

  const max = Math.max(1, ...Object.values(counts));
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
      <p className="text-xs font-semibold flex items-center gap-1 text-muted-foreground">
        <BarChart3 className="w-3.5 h-3.5" />
        Stemmen van alle spelers ({total})
      </p>
      {[...FOCUS_OPTIONS]
        .map((opt) => ({ opt, value: counts[opt] || 0 }))
        .sort((a, b) => b.value - a.value || a.opt.localeCompare(b.opt))
        .map(({ opt, value }) => (
        <div key={opt} className="flex items-center gap-2">
          <span className="text-xs w-24 shrink-0">{opt}</span>
          <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(value / max) * 100}%` }}
            />
          </div>
          <span className="text-xs tabular-nums w-5 text-right">{value}</span>
        </div>
        ))}
    </div>
  );
}
