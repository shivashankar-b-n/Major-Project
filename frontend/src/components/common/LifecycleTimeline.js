import React from 'react';
import { CheckCircle2, Circle, Dot } from 'lucide-react';
import { STATUS_META } from '@/lib/constants';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

export const LifecycleTimeline = ({ history = [] }) => {
  return (
    <ol className="relative space-y-5">
      {history.map((h, i) => {
        const isLast = i === history.length - 1;
        const meta = STATUS_META[h.status] || { label: h.status };
        return (
          <li key={i} className="relative flex gap-3.5">
            {!isLast && <span className="absolute left-[11px] top-6 h-full w-px bg-border" aria-hidden />}
            <span
              className={cn(
                'z-10 mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 bg-card',
                isLast ? 'border-primary text-primary' : 'border-success text-success',
              )}
            >
              {isLast ? <Circle className="h-3 w-3 fill-primary" /> : <CheckCircle2 className="h-4 w-4" />}
            </span>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-foreground">{meta.label}</span>
                <span className="font-mono text-[11px] text-muted-foreground">{formatDate(h.at, true)}</span>
              </div>
              {h.note && <p className="mt-0.5 text-sm text-muted-foreground">{h.note}</p>}
              {h.by && (
                <p className="mt-0.5 inline-flex items-center text-xs text-muted-foreground">
                  <Dot className="h-4 w-4" /> {h.by}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};
