import React, { useMemo, useState } from 'react';
import { PRIORITY_META } from '@/lib/constants';
import { cn } from '@/lib/utils';

// Bengaluru bounding box (approx) for normalising lat/lng into the SVG canvas.
const BOUNDS = { latMin: 12.88, latMax: 13.12, lngMin: 77.53, lngMax: 77.78 };
const W = 800;
const H = 520;
const PAD = 46;

const project = (lat, lng) => {
  const x = PAD + ((lng - BOUNDS.lngMin) / (BOUNDS.lngMax - BOUNDS.lngMin)) * (W - PAD * 2);
  const y = H - PAD - ((lat - BOUNDS.latMin) / (BOUNDS.latMax - BOUNDS.latMin)) * (H - PAD * 2);
  return { x: Math.max(PAD, Math.min(W - PAD, x)), y: Math.max(PAD, Math.min(H - PAD, y)) };
};

const PRIORITY_FILL = {
  LOW: 'hsl(var(--priority-low))',
  MEDIUM: 'hsl(var(--priority-medium))',
  HIGH: 'hsl(var(--priority-high))',
  CRITICAL: 'hsl(var(--priority-critical))',
};

export const StylizedCityMap = ({ points = [], onSelect, selectedId, showHotspots = true, className, height = 460 }) => {
  const [hover, setHover] = useState(null);

  const projected = useMemo(
    () => points.filter((p) => p?.location?.lat).map((p) => ({ ...p, ...project(p.location.lat, p.location.lng) })),
    [points],
  );

  // Hotspots: cluster centres for wards with >=3 points.
  const hotspots = useMemo(() => {
    if (!showHotspots) return [];
    const byWard = {};
    projected.forEach((p) => {
      const w = p.location.ward || 'x';
      byWard[w] = byWard[w] || { sx: 0, sy: 0, n: 0 };
      byWard[w].sx += p.x; byWard[w].sy += p.y; byWard[w].n += 1;
    });
    return Object.values(byWard).filter((c) => c.n >= 3).map((c) => ({ x: c.sx / c.n, y: c.sy / c.n, n: c.n }));
  }, [projected, showHotspots]);

  return (
    <div className={cn('relative overflow-hidden rounded-2xl border border-border bg-[hsl(210_40%_97%)]', className)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height, maxHeight: height }} preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="blocks" width="46" height="46" patternUnits="userSpaceOnUse">
            <rect width="46" height="46" fill="none" />
            <path d="M46 0H0V46" fill="none" stroke="hsl(214 26% 88%)" strokeWidth="1" />
          </pattern>
          <radialGradient id="hot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(0 74% 51%)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="hsl(0 74% 51%)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width={W} height={H} fill="hsl(210 40% 97%)" />
        <rect width={W} height={H} fill="url(#blocks)" />

        {/* stylised green belts */}
        <ellipse cx="140" cy="120" rx="88" ry="58" fill="hsl(152 40% 82%)" opacity="0.55" />
        <ellipse cx="650" cy="400" rx="104" ry="64" fill="hsl(152 40% 82%)" opacity="0.5" />
        {/* stylised water body */}
        <path d="M540 60 q60 20 40 80 q-20 60 40 90 q40 30 -10 70" fill="none" stroke="hsl(200 70% 78%)" strokeWidth="22" strokeLinecap="round" opacity="0.55" />

        {/* arterial roads */}
        <g stroke="hsl(214 20% 82%)" strokeWidth="6" strokeLinecap="round">
          <line x1="40" y1="170" x2="760" y2="210" />
          <line x1="120" y1="40" x2="180" y2="480" />
          <line x1="40" y1="360" x2="760" y2="320" />
          <line x1="520" y1="40" x2="600" y2="480" />
        </g>

        {/* hotspots */}
        {hotspots.map((h, i) => (
          <circle key={`h${i}`} cx={h.x} cy={h.y} r={54} fill="url(#hot)" />
        ))}

        {/* markers */}
        {projected.map((p) => {
          const fill = PRIORITY_FILL[p.priority] || PRIORITY_FILL.LOW;
          const isSel = selectedId === p.id;
          const isHover = hover?.id === p.id;
          const r = isSel || isHover ? 9 : 6.5;
          return (
            <g key={p.id} transform={`translate(${p.x} ${p.y})`} className="cursor-pointer"
               onMouseEnter={() => setHover(p)} onMouseLeave={() => setHover(null)}
               onClick={() => onSelect?.(p)}>
              {(p.priority === 'CRITICAL') && <circle r={r + 6} fill={fill} opacity="0.25" className="animate-pulse-ring" />}
              <circle r={r + 3} fill="white" opacity="0.9" />
              <circle r={r} fill={fill} stroke="white" strokeWidth="1.5" />
            </g>
          );
        })}
      </svg>

      {/* tooltip */}
      {hover && (
        <div
          className="pointer-events-none absolute z-20 max-w-[220px] rounded-lg border border-border bg-popover p-2.5 text-xs shadow-elevated"
          style={{ left: `calc(${(hover.x / W) * 100}% + 8px)`, top: `calc(${(hover.y / H) * 100}% - 8px)` }}
        >
          <div className="font-mono text-[10px] text-muted-foreground">{hover.tracking_id}</div>
          <div className="line-clamp-2 font-semibold text-foreground">{hover.title}</div>
          <div className="mt-1 flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ background: PRIORITY_FILL[hover.priority] }} />
            {PRIORITY_META[hover.priority]?.label} · {hover.department}
          </div>
        </div>
      )}

      {/* legend */}
      <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border bg-card/90 px-3 py-2 text-[11px] font-medium backdrop-blur">
        {Object.keys(PRIORITY_META).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: PRIORITY_FILL[k] }} />
            {PRIORITY_META[k].label}
          </span>
        ))}
      </div>
      <div className="absolute right-3 top-3 rounded-lg border border-border bg-card/90 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground backdrop-blur">
        Stylised city view
      </div>
    </div>
  );
};
