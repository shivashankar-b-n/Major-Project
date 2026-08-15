import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell,
  PieChart, Pie,
} from 'recharts';
import { InlineSpinner } from '@/components/common/Loaders';
import { StatCard } from '@/components/common/StatCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DepartmentChip } from '@/components/common/Badges';
import { analyticsApi } from '@/lib/api';
import { PRIORITY_META, DEPARTMENT_META } from '@/lib/constants';
import { CheckCircle2, Timer, RotateCcw, Smile } from 'lucide-react';

const PRIORITY_COLORS = { LOW: 'hsl(var(--priority-low))', MEDIUM: 'hsl(var(--priority-medium))', HIGH: 'hsl(var(--priority-high))', CRITICAL: 'hsl(var(--priority-critical))' };
const CHART = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--priority-high))', 'hsl(var(--priority-critical))'];

export default function AdminAnalytics() {
  const [ov, setOv] = useState(null);
  const [perf, setPerf] = useState([]);
  useEffect(() => {
    analyticsApi.overview().then(setOv).catch(() => {});
    analyticsApi.departmentPerformance().then(setPerf).catch(() => {});
  }, []);
  if (!ov) return <InlineSpinner label="Loading analytics…" />;

  const priorityData = ov.by_priority.map((p) => ({ name: PRIORITY_META[p.priority]?.label, value: p.count, key: p.priority }));
  const deptData = ov.by_department.map((d) => ({ name: DEPARTMENT_META[d.department]?.short || d.department, value: d.count }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">City Analytics</h1>
        <p className="text-sm text-muted-foreground">Computed from seeded demo data — not fabricated</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Resolution rate" value={`${ov.resolution_rate}%`} icon={CheckCircle2} accent="success" />
        <StatCard label="Avg resolution" value={ov.avg_resolution_hours ? `${ov.avg_resolution_hours}h` : '–'} icon={Timer} accent="primary" />
        <StatCard label="Reopened" value={ov.reopened} icon={RotateCcw} accent="warning" />
        <StatCard label="Satisfaction" value={ov.satisfaction ? `${ov.satisfaction}/5` : '–'} icon={Smile} accent="accent" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 card-shadow lg:col-span-2">
          <h3 className="font-display text-base font-semibold text-foreground">Reported vs Resolved (14 days)</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ov.trend} margin={{ left: -20, right: 8, top: 4 }}>
                <defs>
                  <linearGradient id="t1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.35} /><stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} /></linearGradient>
                  <linearGradient id="t2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--chart-4))" stopOpacity={0.35} /><stop offset="100%" stopColor="hsl(var(--chart-4))" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} interval={2} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                <Area type="monotone" dataKey="reported" stroke="hsl(var(--chart-1))" strokeWidth={2} fill="url(#t1)" />
                <Area type="monotone" dataKey="resolved" stroke="hsl(var(--chart-4))" strokeWidth={2} fill="url(#t2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 card-shadow">
          <h3 className="font-display text-base font-semibold text-foreground">Priority mix</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={priorityData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={88} paddingAngle={3}>
                  {priorityData.map((d) => <Cell key={d.key} fill={PRIORITY_COLORS[d.key]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs">
            {priorityData.map((d) => <span key={d.key} className="inline-flex items-center gap-1.5 text-muted-foreground"><span className="h-2.5 w-2.5 rounded-full" style={{ background: PRIORITY_COLORS[d.key] }} />{d.name}</span>)}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 card-shadow">
          <h3 className="font-display text-base font-semibold text-foreground">Complaints by department</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} layout="vertical" margin={{ left: 10, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={64} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>{deptData.map((d, i) => <Cell key={d.name} fill={CHART[i % CHART.length]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 card-shadow">
          <h3 className="font-display text-base font-semibold text-foreground">Ward hotspots</h3>
          <div className="mt-4 space-y-2.5">
            {ov.hotspots.map((h, i) => {
              const max = ov.hotspots[0]?.count || 1;
              return (
                <div key={h.ward} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 truncate text-sm font-medium text-foreground">{h.ward}</span>
                  <div className="h-6 flex-1 overflow-hidden rounded-md bg-secondary">
                    <div className="flex h-full items-center justify-end rounded-md bg-primary/80 px-2 text-[11px] font-semibold text-primary-foreground" style={{ width: `${(h.count / max) * 100}%` }}>{h.count}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card card-shadow">
        <div className="border-b border-border p-5"><h3 className="font-display text-base font-semibold text-foreground">Department performance</h3></div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>Department</TableHead><TableHead>Total</TableHead><TableHead>Active</TableHead>
                <TableHead>Resolved</TableHead><TableHead>Resolution rate</TableHead><TableHead>SLA breaches</TableHead><TableHead>Satisfaction</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perf.map((d) => (
                <TableRow key={d.department}>
                  <TableCell><DepartmentChip department={d.department} short /></TableCell>
                  <TableCell className="font-mono">{d.total}</TableCell>
                  <TableCell className="font-mono">{d.active}</TableCell>
                  <TableCell className="font-mono">{d.resolved}</TableCell>
                  <TableCell><span className="font-mono font-semibold text-success">{d.resolution_rate}%</span></TableCell>
                  <TableCell><span className="font-mono text-destructive">{d.sla_breached}</span></TableCell>
                  <TableCell className="font-mono">{d.satisfaction ? `${d.satisfaction}/5` : '–'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
