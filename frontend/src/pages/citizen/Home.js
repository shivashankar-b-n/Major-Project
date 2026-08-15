import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, ChevronRight, MapPin, FileText, CheckCircle2, Clock, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ComplaintCard } from '@/components/common/ComplaintCard';
import { PriorityBadge, DepartmentChip } from '@/components/common/Badges';
import { InlineSpinner } from '@/components/common/Loaders';
import { EmptyState } from '@/components/common/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { complaintApi } from '@/lib/api';
import { t } from '@/lib/i18n';
import { greetingKey, timeAgo } from '@/lib/format';

export default function CitizenHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mine, setMine] = useState(null);
  const [nearby, setNearby] = useState(null);

  useEffect(() => {
    complaintApi.list({ scope: 'mine' }).then(setMine).catch(() => setMine([]));
    complaintApi.nearby().then(setNearby).catch(() => setNearby([]));
  }, []);

  const active = (mine || []).filter((c) => !['RESOLVED', 'REJECTED', 'CANCELLED'].includes(c.status));
  const resolved = (mine || []).filter((c) => c.status === 'RESOLVED');

  return (
    <div className="space-y-6 px-4 py-5">
      {/* Greeting */}
      <div className="animate-fade-in">
        <p className="text-sm text-muted-foreground">{t(greetingKey())},</p>
        <h1 className="font-display text-2xl font-bold text-foreground">{user?.name?.split(' ')[0]} 👋</h1>
        <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" /> Bengaluru · English
        </div>
      </div>

      {/* Report CTA */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate('/app/report')}
        className="relative w-full overflow-hidden rounded-3xl bg-gradient-brand p-5 text-left shadow-glow"
      >
        <div className="absolute -right-6 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 -right-2 h-28 w-28 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/20 text-white">
            <Camera className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <div className="font-display text-xl font-bold text-white">{t('report_issue')}</div>
            <div className="mt-0.5 text-sm text-white/85">{t('report_issue_sub')}</div>
          </div>
          <ChevronRight className="h-5 w-5 text-white/80" />
        </div>
      </motion.button>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active', value: active.length, icon: Clock, tone: 'text-warning bg-warning/10' },
          { label: 'Resolved', value: resolved.length, icon: CheckCircle2, tone: 'text-success bg-success/10' },
          { label: 'Total', value: (mine || []).length, icon: FileText, tone: 'text-primary bg-primary/10' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-3 text-center card-shadow">
            <div className={`mx-auto grid h-9 w-9 place-items-center rounded-xl ${s.tone}`}><s.icon className="h-4.5 w-4.5" /></div>
            <div className="mt-1.5 font-display text-xl font-bold text-foreground">{mine ? s.value : '–'}</div>
            <div className="text-[11px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* My complaints */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-foreground">{t('my_complaints')}</h2>
          {(mine || []).length > 0 && (
            <button onClick={() => navigate('/app/complaints')} className="text-sm font-medium text-primary">{t('view_all')}</button>
          )}
        </div>
        {mine === null ? (
          <InlineSpinner />
        ) : mine.length === 0 ? (
          <EmptyState icon={FileText} title="No complaints yet" description="Report your first civic issue and track it here."
            action={<Button onClick={() => navigate('/app/report')} className="gap-2"><Camera className="h-4 w-4" /> Report an issue</Button>} />
        ) : (
          <div className="space-y-3">
            {mine.slice(0, 3).map((c) => (
              <ComplaintCard key={c.id} complaint={c} to={`/app/complaints/${c.id}`} />
            ))}
          </div>
        )}
      </section>

      {/* Nearby issues */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="font-display text-lg font-semibold text-foreground">{t('nearby_issues')}</h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            <Sparkles className="h-3 w-3" /> Community
          </span>
        </div>
        {nearby === null ? (
          <InlineSpinner />
        ) : nearby.length === 0 ? (
          <p className="text-sm text-muted-foreground">No nearby reports right now.</p>
        ) : (
          <div className="space-y-2">
            {nearby.slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
                  <AlertCircle className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">{c.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <DepartmentChip department={c.department} short />
                    <span className="text-[11px] text-muted-foreground">· {c.location?.ward} · {timeAgo(c.created_at)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <PriorityBadge priority={c.priority} showIcon={false} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
