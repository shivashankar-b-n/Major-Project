import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell,
} from 'recharts';
import { Layers, Activity, CheckCircle2, AlertTriangle, TimerOff, Smile, ArrowRight } from 'lucide-react';
import { StatCard } from '@/components/common/StatCard';
import { InlineSpinner } from '@/components/common/Loaders';
import { DemoBadge } from '@/components/common/DemoBadge';
import { StatusBadge } from '@/components/common/Badges';
import { StylizedCityMap } from '@/components/common/StylizedCityMap';
import { Button } from '@/components/ui/button';
import { analyticsApi, complaintApi } from '@/lib/api';
import { DEPARTMENT_META, PRIORITY_META } from '@/lib/constants';
import { cn } from '@/lib/utils';

const PRIORITY_COLORS = { LOW: 'hsl(var(--priority-low))', MEDIUM: 'hsl(var(--priority-medium))', HIGH: 'hsl(var(--priority-high))', CRITICAL: 'hsl(var(--priority-critical))' };

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [ov, setOv] = useState(null);
  const [perf, setPerf] = useState([]);
  const [points, setPoints] = useState([]);
  const [critical, setCritical] = useState([]);

  useEffect(() => {
    analyticsApi.overview().then(setOv).catch(() => {});
    analyticsApi.departmentPerformance().then(setPerf).catch(() => {});
    analyticsApi.mapPoints().then(setPoints).catch(() => {});
    complaintApi.list({ scope: 'all', priority: 'CRITICAL', sort: 'recent' }).then((l) => setCritical(l.filter((c) => c.status !== 'RESOLVED'))).catch(() => {});
  }, []);

  if (!ov) return <InlineSpinner label="Loading command center…" />;

  const priorityData = ov.by_priority.map((p) => ({ name: PRIORITY_META[p.priority]?.label, value: p.count, key: p.priority }));

  const kpis = [
    { label: 'Total complaints', value: ov.total, icon: Layers, accent: 'primary' },
    { label: 'Active', value: ov.active, icon: Activity, accent: 'warning' },
    { label: 'Resolved', value: ov.resolved, icon: CheckCircle2, accent: 'success' },
    { label: 'Critical', value: ov.critical, icon: AlertTriangle, accent: 'destructive' },
    { label: 'SLA breaches', value: ov.sla_breached, icon: TimerOff, accent: 'destructive' },
    { label: 'Satisfaction', value: ov.satisfaction ? `${ov.satisfaction}/5` : '–', icon: Smile, accent: 'accent' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">City Command Center</h1>
          <p className="text-sm text-muted-foreground">Real-time overview across all seven departments</p>
        </div>
        <DemoBadge />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => <StatCard key={k.label} {...k} />)}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 card-shadow lg:col-span-2">
          <h3 className="font-display text-base font-semibold text-foreground">City-wide reported vs resolved (14 days)</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ov.trend} margin={{ left: -20, right: 8, top: 4 }}>
                <defs>
                  <linearGradient id="cr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.35} /><stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} /></linearGradient>
                  <linearGradient id="cs" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--chart-4))" stopOpacity={0.35} /><stop offset="100%" stopColor="hsl(var(--chart-4))" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} interval={2} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                <Area type="monotone" dataKey="reported" stroke="hsl(var(--chart-1))" strokeWidth={2} fill="url(#cr)" />
                <Area type="monotone" dataKey="resolved" stroke="hsl(var(--chart-4))" strokeWidth={2} fill="url(#cs)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 card-shadow">
          <h3 className="font-display text-base font-semibold text-foreground">Priority distribution</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData} margin={{ left: -20, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>{priorityData.map((d) => <Cell key={d.key} fill={PRIORITY_COLORS[d.key]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Department performance */}
        <div className="rounded-2xl border border-border bg-card p-5 card-shadow lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-foreground">Department performance</h3>
            <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => navigate('/admin/analytics')}>Details <ArrowRight className="h-3.5 w-3.5" /></Button>
          </div>
          <div className="mt-4 space-y-3">
            {perf.map((d) => {
              const meta = DEPARTMENT_META[d.department]; const Icon = meta?.icon;
              return (
                <div key={d.department} className="flex items-center gap-3">
                  <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', meta?.chip)}>{Icon && <Icon className="h-4 w-4" />}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate font-medium text-foreground">{meta?.short}</span>
                      <span className="font-mono text-xs text-muted-foreground">{d.resolution_rate}% · {d.active} active</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-success" style={{ width: `${d.resolution_rate}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hotspots */}
        <div className="rounded-2xl border border-border bg-card p-5 card-shadow">
          <h3 className="font-display text-base font-semibold text-foreground">Complaint hotspots</h3>
          <div className="mt-4 space-y-2">
            {ov.hotspots.map((h, i) => (
              <div key={h.ward} className="flex items-center gap-3">
                <span className="grid h-6 w-6 place-items-center rounded-md bg-destructive/10 font-mono text-xs font-bold text-destructive">{i + 1}</span>
                <span className="flex-1 text-sm font-medium text-foreground">{h.ward}</span>
                <span className="font-mono text-sm text-muted-foreground">{h.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Map + critical */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-foreground">City map</h3>
            <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => navigate('/admin/map')}>Explore <ArrowRight className="h-3.5 w-3.5" /></Button>
          </div>
          <StylizedCityMap points={points} height={380} />
        </div>
        <div>
          <h3 className="mb-3 font-display text-base font-semibold text-foreground">Critical issues</h3>
          <div className="space-y-2">
            {critical.slice(0, 6).map((c) => (
              <button key={c.id} onClick={() => navigate(`/admin/complaints/${c.id}`)}
                className="flex w-full items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/[0.03] p-3 text-left transition-colors hover:border-destructive/40">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{c.title}</span>
                  <span className="mt-1 flex items-center gap-1.5"><StatusBadge status={c.status} /><span className="text-[11px] text-muted-foreground">{c.location?.ward}</span></span>
                </span>
              </button>
            ))}
            {critical.length === 0 && <p className="text-sm text-muted-foreground">No active critical issues.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
