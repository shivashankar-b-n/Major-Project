import React, { useEffect, useState } from 'react';
import { FileBarChart } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InlineSpinner } from '@/components/common/Loaders';
import { EmptyState } from '@/components/common/EmptyState';
import { ReportView } from '@/components/common/ReportView';
import { dataApi } from '@/lib/api';

export default function AdminReports() {
  const [scope, setScope] = useState('city');
  const [reports, setReports] = useState(null);

  useEffect(() => { setReports(null); dataApi.reports({ scope }).then(setReports).catch(() => setReports([])); }, [scope]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">AI Intelligence Reports</h1>
        <p className="text-sm text-muted-foreground">Automated reports generated every 12 hours for operational decision support</p>
      </div>

      <Tabs value={scope} onValueChange={setScope}>
        <TabsList>
          <TabsTrigger value="city">City-wide</TabsTrigger>
          <TabsTrigger value="department">By department</TabsTrigger>
        </TabsList>
      </Tabs>

      {reports === null ? (
        <InlineSpinner />
      ) : reports.length === 0 ? (
        <EmptyState icon={FileBarChart} title="No reports" description="Reports are generated every 12 hours." />
      ) : (
        <div className="space-y-4">
          {reports.map((r) => <ReportView key={r.id} report={r} />)}
        </div>
      )}
    </div>
  );
}
