import React, { useEffect, useState } from 'react';
import { Database, KeyRound, ShieldCheck, RadioTower, Info } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InlineSpinner } from '@/components/common/Loaders';
import { dataApi } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';

const STATUS_STYLE = {
  active: 'bg-success/12 text-success border-success/25',
  degraded: 'bg-warning/15 text-[hsl(var(--warning-foreground))] border-warning/30',
  auth_required: 'bg-info/10 text-info border-info/20',
};

export default function DataSources() {
  const [sources, setSources] = useState(null);
  useEffect(() => { dataApi.sources().then(setSources).catch(() => setSources([])); }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Data Source Registry</h1>
        <p className="text-sm text-muted-foreground">Multi-source civic data integration layer — citizen data + government/open datasets + APIs</p>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-info/20 bg-info/[0.05] p-3 text-sm text-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
        <span>Sources are shown as a registry only. API secrets are never stored in the client and are managed via server-side environment variables. “Real-time” applies only where the source actually offers API access.</span>
      </div>

      {sources === null ? (
        <InlineSpinner />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card card-shadow">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="min-w-[220px]">Source</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>API key</TableHead>
                  <TableHead>Last fetch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{s.name}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{s.endpoint}</div>
                    </TableCell>
                    <TableCell><span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><RadioTower className="h-3.5 w-3.5" />{s.type}</span></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.department_relevance}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.update_frequency}</TableCell>
                    <TableCell>
                      <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize', STATUS_STYLE[s.status])}>
                        {s.status === 'active' && <ShieldCheck className="h-3 w-3" />} {s.status.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      {s.api_key_required ? <span className="inline-flex items-center gap-1 text-xs font-medium text-warning"><KeyRound className="h-3.5 w-3.5" /> Required</span>
                        : <span className="text-xs text-muted-foreground">Not required</span>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.last_fetch ? timeAgo(s.last_fetch) : 'Never'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
