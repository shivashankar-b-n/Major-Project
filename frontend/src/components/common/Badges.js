import React from 'react';
import { STATUS_META, PRIORITY_META, DEPARTMENT_META } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, Equal, AlertTriangle } from 'lucide-react';

export const StatusBadge = ({ status, className }) => {
  const meta = STATUS_META[status] || { label: status, badge: 'bg-muted text-muted-foreground border-border' };
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', meta.badge, className)}>
      {meta.label}
    </span>
  );
};

const PRIORITY_ICON = { LOW: ChevronDown, MEDIUM: Equal, HIGH: ChevronUp, CRITICAL: AlertTriangle };

export const PriorityBadge = ({ priority, className, showIcon = true }) => {
  const meta = PRIORITY_META[priority] || PRIORITY_META.LOW;
  const Icon = PRIORITY_ICON[priority] || Equal;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold', meta.badge, className)}>
      {showIcon && <Icon className="h-3 w-3" strokeWidth={2.5} />}
      {meta.label}
    </span>
  );
};

export const DepartmentChip = ({ department, className, withIcon = true, short = false }) => {
  const meta = DEPARTMENT_META[department] || {};
  const Icon = meta.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold', meta.chip, className)}>
      {withIcon && Icon && <Icon className="h-3.5 w-3.5" />}
      {short ? meta.short : department}
    </span>
  );
};
