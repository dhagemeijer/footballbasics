import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';

interface StatStepperProps {
  value: number;
  onChange: (newValue: number) => void;
  disabled?: boolean;
}

export function StatStepper({ value, onChange, disabled }: StatStepperProps) {
  return (
    <div className="flex items-center justify-center gap-1">
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 md:h-7 md:w-7"
        disabled={disabled || value <= 0}
        onClick={() => onChange(Math.max(0, value - 1))}
        aria-label="Verlagen"
      >
        <Minus className="w-4 h-4 md:w-3 md:h-3" />
      </Button>
      <span className="min-w-[2ch] text-center font-medium tabular-nums">{value}</span>
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 md:h-7 md:w-7"
        disabled={disabled}
        onClick={() => onChange(value + 1)}
        aria-label="Verhogen"
      >
        <Plus className="w-4 h-4 md:w-3 md:h-3" />
      </Button>
    </div>
  );
}
