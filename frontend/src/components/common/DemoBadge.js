import React from 'react';
import { FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';

// Clearly flags fictional seeded demo data (never real citizen info).
export const DemoBadge = ({ className, label = 'Demo data' }) => (
  <span className={cn('inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-[11px] font-semibold text-[hsl(var(--warning-foreground))]', className)}>
    <FlaskConical className="h-3 w-3" /> {label}
  </span>
);
