import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Layers } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { StatusBadge, PriorityBadge, DepartmentChip } from '@/components/common/Badges';
import { timeAgo, dueLabel } from '@/lib/format';
import { cn } from '@/lib/utils';

export const ComplaintCard = ({ complaint, to, showDepartment = true, className }) => {
  const navigate = useNavigate();
  const due = dueLabel(complaint?.sla?.due_at);
  const isClosed = ['RESOLVED', 'REJECTED', 'CANCELLED'].includes(complaint.status);
  return (
    <Card
      onClick={() => to && navigate(to)}
      className={cn(
        'flex cursor-pointer flex-col gap-3 rounded-2xl border-border p-4 transition-all hover:-translate-y-0.5 hover:shadow-elevated',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-semibold text-muted-foreground">{complaint.tracking_id}</span>
            {complaint.is_duplicate && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                <Layers className="h-2.5 w-2.5" /> Grouped
              </span>
            )}
          </div>
          <h3 className="mt-1 line-clamp-2 font-semibold leading-snug text-foreground">{complaint.title}</h3>
        </div>
        <PriorityBadge priority={complaint.priority} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={complaint.status} />
        {showDepartment && <DepartmentChip department={complaint.department} short />}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="inline-flex min-w-0 items-center gap-1">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{complaint?.location?.address || 'Location pinned'}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {timeAgo(complaint.created_at)}
        </span>
      </div>

      {!isClosed && due.text !== 'No SLA' && (
        <div className={cn('flex items-center gap-1.5 text-[11px] font-medium', due.breached ? 'text-destructive' : 'text-muted-foreground')}>
          <span className={cn('h-1.5 w-1.5 rounded-full', due.breached ? 'bg-destructive' : 'bg-success')} />
          SLA: {due.text}
        </div>
      )}
    </Card>
  );
};
