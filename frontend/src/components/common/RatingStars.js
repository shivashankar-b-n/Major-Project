import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export const RatingStars = ({ value = 0, onChange, size = 'md', readOnly = false }) => {
  const [hover, setHover] = useState(0);
  const dim = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' }[size];
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = (hover || value) >= n;
        return (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            onMouseEnter={() => !readOnly && setHover(n)}
            onMouseLeave={() => !readOnly && setHover(0)}
            onClick={() => !readOnly && onChange?.(n)}
            className={cn('transition-transform', !readOnly && 'hover:scale-110')}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
          >
            <Star className={cn(dim, active ? 'fill-warning text-warning' : 'text-border')} />
          </button>
        );
      })}
    </div>
  );
};
