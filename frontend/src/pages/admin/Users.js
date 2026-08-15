import React, { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Building2, User, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InlineSpinner } from '@/components/common/Loaders';
import { DepartmentChip } from '@/components/common/Badges';
import { DemoBadge } from '@/components/common/DemoBadge';
import { StatCard } from '@/components/common/StatCard';
import { dataApi } from '@/lib/api';
import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';

const ROLE_STYLE = {
  admin: 'bg-destructive/10 text-destructive border-destructive/20',
  officer: 'bg-primary/10 text-primary border-primary/20',
  citizen: 'bg-secondary text-secondary-foreground border-border',
};

export default function AdminUsers() {
  const [users, setUsers] = useState(null);
  const [q, setQ] = useState('');
  useEffect(() => { dataApi.users().then(setUsers).catch(() => setUsers([])); }, []);

  const counts = useMemo(() => {
    const c = { citizen: 0, officer: 0, admin: 0 };
    (users || []).forEach((u) => { c[u.role] = (c[u.role] || 0) + 1; });
    return c;
  }, [users]);

  const filtered = (users || []).filter((u) => (u.name + u.email + (u.department || '')).toLowerCase().includes(q.toLowerCase()));

  if (users === null) return <InlineSpinner label="Loading users…" />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Users &amp; Configuration</h1>
          <p className="text-sm text-muted-foreground">Manage citizens, officers and administrators</p>
        </div>
        <DemoBadge />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Citizens" value={counts.citizen} icon={User} accent="primary" />
        <StatCard label="Officers" value={counts.officer} icon={Building2} accent="accent" />
        <StatCard label="Administrators" value={counts.admin} icon={ShieldCheck} accent="destructive" />
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users…" className="pl-9" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card card-shadow">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>User</TableHead><TableHead>Role</TableHead><TableHead>Department</TableHead><TableHead>Contact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-brand text-[11px] font-bold text-primary-foreground">{initials(u.name)}</span>
                      <span className="font-medium text-foreground">{u.name}</span>
                    </div>
                  </TableCell>
                  <TableCell><span className={cn('inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize', ROLE_STYLE[u.role])}>{u.role}</span></TableCell>
                  <TableCell>{u.department ? <DepartmentChip department={u.department} short /> : <span className="text-sm text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
