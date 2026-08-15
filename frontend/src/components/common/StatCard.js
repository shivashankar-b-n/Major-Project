import React from 'react';
import { cn } from '@/lib/utils';

export const StatCard = ({ icon: Icon, label, value, sub, accent = 'primary', className, onClick }) => {
  const accentMap = {
    primary: 'text-primary bg-primary/10',
    success: 'text-success bg-success/10',
    warning: 'text-[hsl(var(--warning-foreground))] bg-warning/15',
    destructive: 'text-destructive bg-destructive/10',
    accent: 'text-accent bg-accent/10',
    info: 'text-info bg-info/10',
    high: 'text-priority-high bg-priority-high/10',
  };
  return (
    <div
      onClick={onClick}
      className={cn(
        'group rounded-2xl border border-border bg-card p-4 card-shadow transition-all',
        onClick && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-elevated',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground truncate">{label}</div>
          <div className="mt-1.5 font-display text-3xl font-bold tabular text-foreground">{value}</div>
          {sub && <div className="mt-1 text-xs text-muted-foreground truncate">{sub}</div>}
        </div>
        {Icon && (
          <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', accentMap[accent])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
};
