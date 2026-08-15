import React from 'react';
import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';

// AI confidence is a recommendation — never presented as absolute truth.
export const ConfidenceMeter = ({ value = 0, source = 'llm', className }) => {
  const v = Math.max(0, Math.min(100, value || 0));
  const tone = v >= 85 ? 'bg-success' : v >= 65 ? 'bg-primary' : 'bg-warning';
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">AI confidence</span>
        <span className="font-mono font-semibold text-foreground">{v}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div className={cn('h-full rounded-full transition-all duration-700', tone)} style={{ width: `${v}%` }} />
      </div>
      <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        {source === 'llm'
          ? 'AI recommendation from photo, text & location. Please review and correct if needed.'
          : 'Baseline rules estimate. Please review and correct if needed.'}
      </p>
    </div>
  );
};
