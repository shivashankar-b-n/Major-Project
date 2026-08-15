import React, { useEffect, useState } from 'react';
import { FileBarChart } from 'lucide-react';
import { InlineSpinner } from '@/components/common/Loaders';
import { EmptyState } from '@/components/common/EmptyState';
import { ReportView } from '@/components/common/ReportView';
import { dataApi } from '@/lib/api';

export default function OfficerReports() {
  const [reports, setReports] = useState(null);
  useEffect(() => { dataApi.reports().then(setReports).catch(() => setReports([])); }, []);

  if (reports === null) return <InlineSpinner label="Loading reports…" />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Department Reports</h1>
        <p className="text-sm text-muted-foreground">Automated 12-hour operational reports for your department</p>
      </div>
      {reports.length === 0 ? (
        <EmptyState icon={FileBarChart} title="No reports yet" description="Reports are generated every 12 hours." />
      ) : (
        <div className="space-y-4">
          {reports.map((r) => <ReportView key={r.id} report={r} />)}
        </div>
      )}
    </div>
  );
}
