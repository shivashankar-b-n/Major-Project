import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell,
} from 'recharts';
import { Inbox, UserCheck, Loader, CheckCircle2, ChevronUp, AlertTriangle, TimerOff } from 'lucide-react';
import { StatCard } from '@/components/common/StatCard';
import { ComplaintCard } from '@/components/common/ComplaintCard';
import { InlineSpinner } from '@/components/common/Loaders';
import { EmptyState } from '@/components/common/EmptyState';
import { DemoBadge } from '@/components/common/DemoBadge';
import { Button } from '@/components/ui/button';
import { complaintApi, analyticsApi } from '@/lib/api';
import { dueLabel } from '@/lib/format';
import { PRIORITY_META } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';

const PRIORITY_COLORS = { LOW: 'hsl(var(--priority-low))', MEDIUM: 'hsl(var(--priority-medium))', HIGH: 'hsl(var(--priority-high))', CRITICAL: 'hsl(var(--priority-critical))' };

export default function OfficerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    complaintApi.list({ scope: 'department', sort: 'priority' }).then(setList).catch(() => setList([]));
    analyticsApi.overview().then(setOverview).catch(() => setOverview(null));
  }, []);

  if (list === null) return <InlineSpinner label="Loading dashboard…" />;

  const count = (fn) => list.filter(fn).length;
  const active = list.filter((c) => !['RESOLVED', 'REJECTED', 'CANCELLED'].includes(c.status));
  const cards = [
    { label: 'New', value: count((c) => ['NEW', 'ROUTED'].includes(c.status)), icon: Inbox, accent: 'info' },
    { label: 'Assigned', value: count((c) => c.status === 'ASSIGNED'), icon: UserCheck, accent: 'accent' },
    { label: 'In Progress', value: count((c) => c.status === 'IN_PROGRESS'), icon: Loader, accent: 'warning' },
    { label: 'Resolved', value: count((c) => c.status === 'RESOLVED'), icon: CheckCircle2, accent: 'success' },
    { label: 'High Priority', value: count((c) => c.priority === 'HIGH' && !['RESOLVED'].includes(c.status)), icon: ChevronUp, accent: 'high' },
    { label: 'Critical', value: count((c) => c.priority === 'CRITICAL' && !['RESOLVED'].includes(c.status)), icon: AlertTriangle, accent: 'destructive' },
    { label: 'SLA Breached', value: count((c) => dueLabel(c.sla?.due_at).breached && !['RESOLVED'].includes(c.status)), icon: TimerOff, accent: 'destructive' },
  ];

  const priorityData = (overview?.by_priority || []).map((p) => ({ name: PRIORITY_META[p.priority]?.label || p.priority, value: p.count, key: p.priority }));
  const attention = active.filter((c) => ['CRITICAL', 'HIGH'].includes(c.priority) || c.status === 'RESOLUTION_SUBMITTED').slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">{user?.department}</h1>
          <p className="text-sm text-muted-foreground">Operational overview for your department</p>
        </div>
        <DemoBadge />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {cards.map((c) => <StatCard key={c.label} {...c} />)}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Trend */}
        <div className="rounded-2xl border border-border bg-card p-5 card-shadow lg:col-span-2">
          <h3 className="font-display text-base font-semibold text-foreground">Reported vs Resolved (14 days)</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={overview?.trend || []} margin={{ left: -20, right: 8, top: 4 }}>
                <defs>
                  <linearGradient id="rep" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.35} /><stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} /></linearGradient>
                  <linearGradient id="res" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--chart-4))" stopOpacity={0.35} /><stop offset="100%" stopColor="hsl(var(--chart-4))" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} interval={2} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                <Area type="monotone" dataKey="reported" stroke="hsl(var(--chart-1))" strokeWidth={2} fill="url(#rep)" />
                <Area type="monotone" dataKey="resolved" stroke="hsl(var(--chart-4))" strokeWidth={2} fill="url(#res)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority distribution */}
        <div className="rounded-2xl border border-border bg-card p-5 card-shadow">
          <h3 className="font-display text-base font-semibold text-foreground">Priority mix</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData} margin={{ left: -20, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {priorityData.map((d) => <Cell key={d.key} fill={PRIORITY_COLORS[d.key]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Needs attention */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-foreground">Needs attention</h3>
          <Button variant="outline" size="sm" onClick={() => navigate('/officer/queue')}>Open queue</Button>
        </div>
        {attention.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="All clear" description="No high-priority or pending-verification items right now." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {attention.map((c) => <ComplaintCard key={c.id} complaint={c} to={`/officer/complaints/${c.id}`} showDepartment={false} />)}
          </div>
        )}
      </div>
    </div>
  );
}
