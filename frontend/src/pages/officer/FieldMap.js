import React from 'react';
import { MapExplorer } from '@/components/common/MapExplorer';

export default function FieldMap() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Field Map</h1>
        <p className="text-sm text-muted-foreground">Geographic view of complaints and hotspots in your department</p>
      </div>
      <MapExplorer detailBase="/officer/complaints" showDepartmentFilter={false} />
    </div>
  );
}
