import React from 'react';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/common/Logo';

export const PageLoader = ({ label = 'Loading…' }) => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
    <Logo showText={false} size="lg" />
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  </div>
);

export const InlineSpinner = ({ label }) => (
  <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
    <Loader2 className="h-4 w-4 animate-spin" /> {label || 'Loading…'}
  </div>
);
