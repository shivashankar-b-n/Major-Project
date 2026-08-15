import React from 'react';
import { TrendingUp, Lightbulb, MapPin, Repeat, Clock } from 'lucide-react';
import { DemoBadge } from '@/components/common/DemoBadge';
import { formatDate } from '@/lib/format';

const SUM = [
  { key: 'new_reports', label: 'New', tone: 'text-info' },
  { key: 'resolved', label: 'Resolved', tone: 'text-success' },
  { key: 'active', label: 'Active', tone: 'text-warning' },
  { key: 'critical', label: 'Critical', tone: 'text-destructive' },
  { key: 'sla_breaches', label: 'SLA breaches', tone: 'text-destructive' },
];

export const ReportView = ({ report }) => {
  const s = report.summary || {};
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card card-shadow">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-gradient-subtle p-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              {report.scope === 'city' ? 'City-wide' : report.department}
            </span>
            <DemoBadge label="Demo" />
          </div>
          <h3 className="mt-2 font-display text-lg font-bold text-foreground">{report.title}</h3>
          <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> {report.period_label} · generated {formatDate(report.generated_at, true)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-5">
        {SUM.map((it) => (
          <div key={it.key} className="bg-card p-4 text-center">
            <div className={`font-display text-2xl font-bold ${it.tone}`}>{s[it.key] ?? 0}</div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{it.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 p-5 md:grid-cols-2">
        <div className="space-y-4">
          {report.hotspots?.length > 0 && (
            <div>
              <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><MapPin className="h-4 w-4 text-destructive" /> Hotspots</h4>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {report.hotspots.map((h) => (
                  <span key={h.ward} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground">
                    {h.ward} <span className="font-mono text-muted-foreground">{h.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {report.repeated_issues?.length > 0 && (
            <div>
              <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><Repeat className="h-4 w-4 text-warning" /> Repeated issues</h4>
              <ul className="mt-2 space-y-1.5">
                {report.repeated_issues.map((r, i) => <li key={i} className="text-sm text-muted-foreground">• {r}</li>)}
              </ul>
            </div>
          )}
          {report.trends?.length > 0 && (
            <div>
              <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><TrendingUp className="h-4 w-4 text-primary" /> Trends</h4>
              <ul className="mt-2 space-y-1.5">
                {report.trends.map((r, i) => <li key={i} className="text-sm text-muted-foreground">• {r}</li>)}
              </ul>
            </div>
          )}
        </div>

        {report.recommendations?.length > 0 && (
          <div className="rounded-xl border border-accent/25 bg-accent/[0.05] p-4">
            <h4 className="flex items-center gap-1.5 text-sm font-semibold text-accent"><Lightbulb className="h-4 w-4" /> AI recommendations</h4>
            <ul className="mt-2 space-y-2">
              {report.recommendations.map((r, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" /> {r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
