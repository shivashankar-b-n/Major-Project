import React, { useEffect, useMemo, useState } from 'react';
import { Search, FileText, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ComplaintCard } from '@/components/common/ComplaintCard';
import { EmptyState } from '@/components/common/EmptyState';
import { InlineSpinner } from '@/components/common/Loaders';
import { complaintApi } from '@/lib/api';

export default function MyComplaints() {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');

  useEffect(() => { complaintApi.list({ scope: 'mine' }).then(setItems).catch(() => setItems([])); }, []);

  const filtered = useMemo(() => {
    let list = items || [];
    if (tab === 'active') list = list.filter((c) => !['RESOLVED', 'REJECTED', 'CANCELLED'].includes(c.status));
    if (tab === 'resolved') list = list.filter((c) => c.status === 'RESOLVED');
    if (tab === 'attention') list = list.filter((c) => c.status === 'RESOLUTION_SUBMITTED');
    if (q.trim()) list = list.filter((c) => (c.title + c.tracking_id + (c.location?.address || '')).toLowerCase().includes(q.toLowerCase()));
    return list;
  }, [items, tab, q]);

  return (
    <div className="space-y-4 px-4 py-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">My Complaints</h1>
        <Button size="sm" onClick={() => navigate('/app/report')} className="gap-1.5"><Camera className="h-4 w-4" /> New</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title, ID or location" className="pl-9" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="attention">Verify</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>
      </Tabs>

      {items === null ? (
        <InlineSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileText} title="Nothing here yet" description="Complaints matching this view will appear here."
          action={<Button onClick={() => navigate('/app/report')} className="gap-2"><Camera className="h-4 w-4" /> Report an issue</Button>} />
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => <ComplaintCard key={c.id} complaint={c} to={`/app/complaints/${c.id}`} />)}
        </div>
      )}
    </div>
  );
}
