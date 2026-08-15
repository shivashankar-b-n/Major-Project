import React from 'react';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Logo = ({ className, size = 'md', showText = true, tone = 'default' }) => {
  const dims = { sm: 'h-8 w-8', md: 'h-9 w-9', lg: 'h-11 w-11' }[size];
  const text = { sm: 'text-base', md: 'text-lg', lg: 'text-2xl' }[size];
  const textTone = tone === 'light' ? 'text-white' : 'text-foreground';
  const subTone = tone === 'light' ? 'text-white/70' : 'text-muted-foreground';
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className={cn('grid place-items-center rounded-xl bg-gradient-brand text-primary-foreground shadow-glow', dims)}>
        <Activity className="h-1/2 w-1/2" strokeWidth={2.4} />
      </div>
      {showText && (
        <div className="leading-none">
          <div className={cn('font-display font-bold tracking-tight', text, textTone)}>CivicPulse</div>
          <div className={cn('text-[10px] font-medium uppercase tracking-[0.14em] mt-0.5', subTone)}>Smart City Intelligence</div>
        </div>
      )}
    </div>
  );
};
