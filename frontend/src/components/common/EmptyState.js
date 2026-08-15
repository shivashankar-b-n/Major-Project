import React from 'react';
import { cn } from '@/lib/utils';

export const EmptyState = ({ icon: Icon, title, description, action, className }) => (
  <div className={cn('flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center', className)}>
    {Icon && (
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-muted-foreground">
        <Icon className="h-7 w-7" />
      </div>
    )}
    <h3 className="mt-4 font-display text-lg font-semibold text-foreground">{title}</h3>
    {description && <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);
