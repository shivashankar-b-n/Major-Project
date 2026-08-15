import React, { useEffect, useMemo, useState } from 'react';
import { Search, ListChecks } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ComplaintCard } from '@/components/common/ComplaintCard';
import { EmptyState } from '@/components/common/EmptyState';
import { InlineSpinner } from '@/components/common/Loaders';
import { complaintApi } from '@/lib/api';
import { dueLabel } from '@/lib/format';

const STATUS_OPTS = ['NEW', 'ROUTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLUTION_SUBMITTED', 'RESOLVED', 'ESCALATED', 'REOPENED'];

export default function OfficerQueue() {
  const [list, setList] = useState(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [sort, setSort] = useState('priority');

  useEffect(() => { complaintApi.list({ scope: 'department', sort }).then(setList).catch(() => setList([])); }, [sort]);

  const filtered = useMemo(() => {
    let l = list || [];
    if (status !== 'all') l = l.filter((c) => (status === 'SLA' ? dueLabel(c.sla?.due_at).breached && c.status !== 'RESOLVED' : c.status === status));
    if (priority !== 'all') l = l.filter((c) => c.priority === priority);
    if (q.trim()) l = l.filter((c) => (c.title + c.tracking_id + (c.location?.address || '')).toLowerCase().includes(q.toLowerCase()));
    return l;
  }, [list, status, priority, q]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Complaint Queue</h1>
        <p className="text-sm text-muted-foreground">Search, filter and action complaints assigned to your department</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search complaints…" className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="SLA">SLA breached</SelectItem>
            {STATUS_OPTS.map((s) => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="priority">Priority first</SelectItem>
            <SelectItem value="recent">Most recent</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {list === null ? (
        <InlineSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState icon={ListChecks} title="No matching complaints" description="Try adjusting your filters." />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{filtered.length} complaints</p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((c) => <ComplaintCard key={c.id} complaint={c} to={`/officer/complaints/${c.id}`} showDepartment={false} />)}
          </div>
        </>
      )}
    </div>
  );
}
