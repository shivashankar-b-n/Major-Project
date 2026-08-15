import React from 'react';
import { MapExplorer } from '@/components/common/MapExplorer';

export default function CityMap() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">City Map</h1>
        <p className="text-sm text-muted-foreground">Complaint markers, priority overlays and hotspots across all wards</p>
      </div>
      <MapExplorer detailBase="/admin/complaints" showDepartmentFilter />
    </div>
  );
}
