import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Cpu, ShieldCheck, Route, Wrench, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/EmptyState';
import { InlineSpinner } from '@/components/common/Loaders';
import { notificationApi } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';

const ICONS = {
  submitted: Cpu, assigned: Route, work_started: Wrench, status: Bell,
  verification_required: ShieldCheck, resolved: CheckCircle2, reopened: RotateCcw, escalation: AlertTriangle,
};

export default function Notifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);

  const load = () => notificationApi.list().then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  const open = async (n) => {
    if (!n.read) { await notificationApi.read(n.id).catch(() => {}); }
    if (n.complaint_id) navigate(`/app/complaints/${n.complaint_id}`);
  };
  const markAll = async () => { await notificationApi.readAll().catch(() => {}); load(); };

  const unread = (items || []).filter((n) => !n.read).length;

  return (
    <div className="space-y-4 px-4 py-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Alerts</h1>
          {unread > 0 && <p className="text-sm text-muted-foreground">{unread} unread</p>}
        </div>
        {unread > 0 && <Button variant="outline" size="sm" onClick={markAll} className="gap-1.5"><CheckCheck className="h-4 w-4" /> Mark all read</Button>}
      </div>

      {items === null ? (
        <InlineSpinner />
      ) : items.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="Updates about your complaints will show up here." />
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const Icon = ICONS[n.type] || Bell;
            return (
              <button key={n.id} onClick={() => open(n)}
                className={cn('flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors',
                  n.read ? 'border-border bg-card hover:bg-secondary/50' : 'border-primary/20 bg-primary/[0.04] hover:bg-primary/[0.07]')}>
                <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg', n.read ? 'bg-secondary text-muted-foreground' : 'bg-primary/10 text-primary')}>
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-foreground">{n.title}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</span>
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{n.body}</span>
                </span>
                {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
