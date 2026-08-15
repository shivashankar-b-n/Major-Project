// Domain constants + presentation maps (full class strings for Tailwind JIT).
import {
  Droplets, Trash2, TrafficCone, ShieldAlert, Zap, Construction, Trees,
} from 'lucide-react';

export const DEPARTMENTS = [
  'Water & Sewage', 'Waste Management', 'Traffic', 'Police / Public Safety',
  'Electricity', 'Roads & Infrastructure', 'Parks',
];

export const DEPARTMENT_META = {
  'Water & Sewage': { icon: Droplets, color: 'text-info', chip: 'bg-info/10 text-info border-info/20', short: 'Water' },
  'Waste Management': { icon: Trash2, color: 'text-success', chip: 'bg-success/10 text-success border-success/20', short: 'Waste' },
  'Traffic': { icon: TrafficCone, color: 'text-warning', chip: 'bg-warning/10 text-[hsl(var(--warning-foreground))] border-warning/25', short: 'Traffic' },
  'Police / Public Safety': { icon: ShieldAlert, color: 'text-destructive', chip: 'bg-destructive/10 text-destructive border-destructive/20', short: 'Police' },
  'Electricity': { icon: Zap, color: 'text-priority-high', chip: 'bg-priority-high/10 text-priority-high border-priority-high/20', short: 'Power' },
  'Roads & Infrastructure': { icon: Construction, color: 'text-accent', chip: 'bg-accent/10 text-accent border-accent/20', short: 'Roads' },
  'Parks': { icon: Trees, color: 'text-chart-4', chip: 'bg-chart-4/10 text-chart-4 border-chart-4/20', short: 'Parks' },
};

export const PRIORITY_META = {
  LOW: { label: 'Low', badge: 'bg-priority-low/10 text-priority-low border-priority-low/25', dot: 'bg-priority-low', bar: 'bg-priority-low', icon: 'chevron-down' },
  MEDIUM: { label: 'Medium', badge: 'bg-priority-medium/12 text-[hsl(var(--warning-foreground))] border-priority-medium/30', dot: 'bg-priority-medium', bar: 'bg-priority-medium', icon: 'equal' },
  HIGH: { label: 'High', badge: 'bg-priority-high/12 text-priority-high border-priority-high/30', dot: 'bg-priority-high', bar: 'bg-priority-high', icon: 'chevron-up' },
  CRITICAL: { label: 'Critical', badge: 'bg-priority-critical/12 text-priority-critical border-priority-critical/30', dot: 'bg-priority-critical', bar: 'bg-priority-critical', icon: 'alert-triangle' },
};

export const STATUS_META = {
  NEW: { label: 'New', badge: 'bg-info/10 text-info border-info/20' },
  ROUTED: { label: 'Routed', badge: 'bg-primary/10 text-primary border-primary/20' },
  ASSIGNED: { label: 'Assigned', badge: 'bg-accent/10 text-accent border-accent/20' },
  IN_PROGRESS: { label: 'In Progress', badge: 'bg-warning/12 text-[hsl(var(--warning-foreground))] border-warning/30' },
  RESOLUTION_SUBMITTED: { label: 'Verification Needed', badge: 'bg-priority-high/12 text-priority-high border-priority-high/30' },
  RESOLVED: { label: 'Resolved', badge: 'bg-success/12 text-success border-success/25' },
  REOPENED: { label: 'Reopened', badge: 'bg-destructive/10 text-destructive border-destructive/25' },
  ESCALATED: { label: 'Escalated', badge: 'bg-destructive/12 text-destructive border-destructive/30' },
  REJECTED: { label: 'Rejected', badge: 'bg-muted text-muted-foreground border-border' },
  CANCELLED: { label: 'Cancelled', badge: 'bg-muted text-muted-foreground border-border' },
};

export const LIFECYCLE = [
  'NEW', 'ROUTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLUTION_SUBMITTED', 'RESOLVED',
];

export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
];
