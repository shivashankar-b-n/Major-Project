import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ListChecks } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge, PriorityBadge, DepartmentChip } from '@/components/common/Badges';
import { EmptyState } from '@/components/common/EmptyState';
import { InlineSpinner } from '@/components/common/Loaders';
import { complaintApi } from '@/lib/api';
import { DEPARTMENTS } from '@/lib/constants';
import { timeAgo, dueLabel } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function AdminComplaints() {
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('all');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');

  useEffect(() => {
    const params = { scope: 'all', sort: 'recent' };
    if (dept !== 'all') params.department = dept;
    complaintApi.list(params).then(setList).catch(() => setList([]));
  }, [dept]);

  const filtered = useMemo(() => {
    let l = list || [];
    if (status !== 'all') l = l.filter((c) => c.status === status);
    if (priority !== 'all') l = l.filter((c) => c.priority === priority);
    if (q.trim()) l = l.filter((c) => (c.title + c.tracking_id + (c.location?.address || '')).toLowerCase().includes(q.toLowerCase()));
    return l;
  }, [list, status, priority, q]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">All Complaints</h1>
        <p className="text-sm text-muted-foreground">City-wide complaint register across all departments</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search complaints…" className="pl-9" />
        </div>
        <Select value={dept} onValueChange={setDept}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All departments</SelectItem>{DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All statuses</SelectItem>{['NEW', 'ROUTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLUTION_SUBMITTED', 'RESOLVED', 'ESCALATED', 'REOPENED'].map((s) => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All priorities</SelectItem>{['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {list === null ? (
        <InlineSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState icon={ListChecks} title="No complaints found" description="Try adjusting the filters." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card card-shadow">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Tracking ID</TableHead>
                  <TableHead className="min-w-[240px]">Issue</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ward</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => {
                  const due = dueLabel(c.sla?.due_at);
                  const closed = ['RESOLVED', 'REJECTED', 'CANCELLED'].includes(c.status);
                  return (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/admin/complaints/${c.id}`)}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{c.tracking_id}</TableCell>
                      <TableCell className="max-w-[260px]"><span className="line-clamp-1 font-medium text-foreground">{c.title}</span></TableCell>
                      <TableCell><DepartmentChip department={c.department} short /></TableCell>
                      <TableCell><PriorityBadge priority={c.priority} /></TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.location?.ward}</TableCell>
                      <TableCell><span className={cn('text-xs font-medium', !closed && due.breached ? 'text-destructive' : 'text-muted-foreground')}>{closed ? '—' : due.text}</span></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{timeAgo(c.updated_at)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
