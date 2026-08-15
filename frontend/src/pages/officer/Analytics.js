import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts';
import { CheckCircle2, Timer, RotateCcw, Star, TimerOff } from 'lucide-react';
import { StatCard } from '@/components/common/StatCard';
import { InlineSpinner } from '@/components/common/Loaders';
import { analyticsApi } from '@/lib/api';

export default function OfficerAnalytics() {
  const [ov, setOv] = useState(null);
  useEffect(() => { analyticsApi.overview().then(setOv).catch(() => setOv(null)); }, []);
  if (!ov) return <InlineSpinner label="Loading analytics…" />;

  const rate = ov.resolution_rate || 0;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Department Analytics</h1>
        <p className="text-sm text-muted-foreground">Performance metrics based on seeded demo data</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Resolution rate" value={`${rate}%`} icon={CheckCircle2} accent="success" />
        <StatCard label="Avg resolution" value={ov.avg_resolution_hours ? `${ov.avg_resolution_hours}h` : '–'} icon={Timer} accent="primary" />
        <StatCard label="Reopened" value={ov.reopened} icon={RotateCcw} accent="warning" />
        <StatCard label="SLA breached" value={ov.sla_breached} icon={TimerOff} accent="destructive" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 card-shadow lg:col-span-2">
          <h3 className="font-display text-base font-semibold text-foreground">Reported vs Resolved trend</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ov.trend} margin={{ left: -20, right: 8, top: 4 }}>
                <defs>
                  <linearGradient id="a1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.35} /><stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} /></linearGradient>
                  <linearGradient id="a2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--chart-4))" stopOpacity={0.35} /><stop offset="100%" stopColor="hsl(var(--chart-4))" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} interval={2} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                <Area type="monotone" dataKey="reported" stroke="hsl(var(--chart-1))" strokeWidth={2} fill="url(#a1)" />
                <Area type="monotone" dataKey="resolved" stroke="hsl(var(--chart-4))" strokeWidth={2} fill="url(#a2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-col rounded-2xl border border-border bg-card p-5 card-shadow">
          <h3 className="font-display text-base font-semibold text-foreground">Resolution rate</h3>
          <div className="relative mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="72%" outerRadius="100%" data={[{ name: 'rate', value: rate, fill: 'hsl(var(--chart-4))' }]} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar background={{ fill: 'hsl(var(--muted))' }} dataKey="value" cornerRadius={20} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-3xl font-bold text-foreground">{rate}%</span>
              <span className="text-xs text-muted-foreground">resolved</span>
            </div>
          </div>
          <div className="mt-auto flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <Star className="h-4 w-4 fill-warning text-warning" /> Satisfaction {ov.satisfaction ?? '–'} / 5
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 card-shadow">
        <h3 className="font-display text-base font-semibold text-foreground">Complaints by status</h3>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {ov.by_status.map((s) => (
            <div key={s.status} className="rounded-xl border border-border bg-background p-3">
              <div className="font-display text-2xl font-bold text-foreground">{s.count}</div>
              <div className="text-xs capitalize text-muted-foreground">{s.status.replace(/_/g, ' ').toLowerCase()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
