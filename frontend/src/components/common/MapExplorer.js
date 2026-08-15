import React, { useEffect, useMemo, useState } from 'react';
import { StylizedCityMap } from '@/components/common/StylizedCityMap';
import { DepartmentChip, PriorityBadge, StatusBadge } from '@/components/common/Badges';
import { InlineSpinner } from '@/components/common/Loaders';
import { EmptyState } from '@/components/common/EmptyState';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { analyticsApi } from '@/lib/api';
import { DEPARTMENTS } from '@/lib/constants';
import { MapPin, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const MapExplorer = ({ detailBase, showDepartmentFilter = true }) => {
  const navigate = useNavigate();
  const [points, setPoints] = useState(null);
  const [dept, setDept] = useState('all');
  const [priority, setPriority] = useState('all');
  const [selected, setSelected] = useState(null);

  useEffect(() => { analyticsApi.mapPoints().then(setPoints).catch(() => setPoints([])); }, []);

  const filtered = useMemo(() => (points || []).filter((p) =>
    (dept === 'all' || p.department === dept) && (priority === 'all' || p.priority === priority)), [points, dept, priority]);

  if (points === null) return <InlineSpinner label="Loading map…" />;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground"><Filter className="h-4 w-4" /> Filters</span>
          {showDepartmentFilter && (
            <Select value={dept} onValueChange={setDept}>
              <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="ml-auto text-sm text-muted-foreground">{filtered.length} markers</span>
        </div>
        <StylizedCityMap points={filtered} height={520} selectedId={selected?.id} onSelect={setSelected} />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {selected ? 'Selected marker' : `${filtered.length} complaints`}
        </h3>
        {selected ? (
          <div className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-4">
            <div className="font-mono text-xs text-muted-foreground">{selected.tracking_id}</div>
            <div className="mt-1 font-semibold text-foreground">{selected.title}</div>
            <div className="mt-2 flex flex-wrap gap-1.5"><PriorityBadge priority={selected.priority} /><StatusBadge status={selected.status} /></div>
            <div className="mt-2 text-sm text-muted-foreground"><MapPin className="mr-1 inline h-3.5 w-3.5" />{selected.location?.ward}</div>
            <button onClick={() => navigate(`${detailBase}/${selected.id}`)} className="mt-3 text-sm font-semibold text-primary hover:underline">Open complaint →</button>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={MapPin} title="No markers" description="Adjust filters to see complaints on the map." />
        ) : (
          <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
            {filtered.slice(0, 40).map((p) => (
              <button key={p.id} onClick={() => setSelected(p)}
                className="flex w-full items-start gap-2 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/40">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: `hsl(var(--priority-${p.priority?.toLowerCase()}))` }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{p.title}</span>
                  <span className="block text-xs text-muted-foreground">{p.location?.ward} · {p.department}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
