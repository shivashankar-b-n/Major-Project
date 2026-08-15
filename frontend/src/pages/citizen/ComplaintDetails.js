import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ChevronLeft, MapPin, Cpu, ThumbsUp, ThumbsDown, Layers, ImageIcon, ShieldCheck, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { StatusBadge, PriorityBadge, DepartmentChip } from '@/components/common/Badges';
import { LifecycleTimeline } from '@/components/common/LifecycleTimeline';
import { ConfidenceMeter } from '@/components/common/ConfidenceMeter';
import { StylizedCityMap } from '@/components/common/StylizedCityMap';
import { RatingStars } from '@/components/common/RatingStars';
import { PageLoader } from '@/components/common/Loaders';
import { complaintApi } from '@/lib/api';
import { formatDate } from '@/lib/format';

export default function ComplaintDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [c, setC] = useState(null);
  const [dialog, setDialog] = useState(null); // 'yes' | 'no'
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => complaintApi.get(id).then(setC).catch(() => { toast.error('Could not load complaint'); navigate('/app/complaints'); }), [id, navigate]);
  useEffect(() => { load(); }, [load]);

  if (!c) return <div className="px-4"><PageLoader label="Loading complaint…" /></div>;

  const evidenceImg = c.media?.find((m) => m.type === 'image' && m.data)?.data;
  const canVerify = c.status === 'RESOLUTION_SUBMITTED';

  const doVerify = async (confirmed) => {
    setBusy(true);
    try {
      await complaintApi.verify(id, { confirmed, rating: confirmed ? rating : (rating || 2), comment });
      toast.success(confirmed ? 'Marked as resolved. Thank you!' : 'Complaint reopened for further action');
      setDialog(null); setComment('');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Action failed');
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5 px-4 py-5">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Back
      </button>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-muted-foreground">{c.tracking_id}</span>
          {c.linked_reports > 1 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
              <Layers className="h-3 w-3" /> {c.linked_reports} linked reports
            </span>
          )}
        </div>
        <h1 className="mt-1 font-display text-xl font-bold leading-snug text-foreground">{c.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={c.status} />
          <PriorityBadge priority={c.priority} />
          <DepartmentChip department={c.department} short />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Reported {formatDate(c.created_at, true)}</p>
      </div>

      {/* Verification banner */}
      {canVerify && (
        <div className="rounded-2xl border border-priority-high/30 bg-priority-high/[0.06] p-4">
          <div className="flex items-center gap-2 font-semibold text-priority-high"><ShieldCheck className="h-5 w-5" /> Your verification is needed</div>
          <p className="mt-1 text-sm text-muted-foreground">The department submitted resolution evidence. Is this issue actually resolved?</p>
          {c.resolution?.work_note && (
            <p className="mt-2 rounded-lg bg-card p-3 text-sm text-foreground"><span className="font-medium">Work done: </span>{c.resolution.work_note}</p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button onClick={() => setDialog('yes')} className="gap-2 bg-success text-success-foreground hover:bg-success/90"><ThumbsUp className="h-4 w-4" /> Yes, resolved</Button>
            <Button onClick={() => setDialog('no')} variant="outline" className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/5"><ThumbsDown className="h-4 w-4" /> Not resolved</Button>
          </div>
        </div>
      )}

      {/* Resolved feedback */}
      {c.status === 'RESOLVED' && c.feedback && (
        <div className="rounded-2xl border border-success/30 bg-success/[0.06] p-4">
          <div className="flex items-center gap-2 font-semibold text-success"><ShieldCheck className="h-5 w-5" /> Resolution confirmed</div>
          {c.feedback.rating && <div className="mt-2"><RatingStars value={c.feedback.rating} readOnly size="sm" /></div>}
          {c.feedback.comment && <p className="mt-2 text-sm text-muted-foreground">“{c.feedback.comment}”</p>}
        </div>
      )}

      {/* Evidence */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Evidence</h2>
        {evidenceImg ? (
          <img src={evidenceImg} alt="evidence" className="h-56 w-full rounded-2xl border border-border object-cover" />
        ) : (
          <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 text-muted-foreground">
            <ImageIcon className="h-8 w-8" /><span className="mt-1 text-sm">Photo evidence on file</span>
          </div>
        )}
        {c.description && <p className="rounded-xl bg-muted/50 p-3 text-sm text-foreground">{c.description}</p>}
      </section>

      {/* Before / After */}
      {c.resolution && (c.resolution.before_image || c.resolution.after_image) && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Resolution evidence</h2>
          <div className="grid grid-cols-2 gap-3">
            {['before_image', 'after_image'].map((k) => (
              <div key={k}>
                <div className="mb-1 text-xs font-medium capitalize text-muted-foreground">{k.split('_')[0]}</div>
                {c.resolution[k] ? <img src={c.resolution[k]} alt={k} className="h-32 w-full rounded-xl border border-border object-cover" />
                  : <div className="grid h-32 place-items-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">Not provided</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* AI analysis */}
      {c.ai_prediction && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground"><Cpu className="h-4 w-4" /> AI analysis</h2>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm text-foreground">{c.ai_prediction.reasoning}</p>
            <div className="mt-3"><ConfidenceMeter value={c.ai_prediction.confidence} source={c.ai_prediction.source} /></div>
          </div>
        </section>
      )}

      {/* Location */}
      <section className="space-y-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground"><MapPin className="h-4 w-4" /> Location</h2>
        <p className="text-sm text-foreground">{c.location?.address}</p>
        <StylizedCityMap height={200} showHotspots={false}
          points={[{ id: c.id, title: c.title, priority: c.priority, department: c.department, location: c.location }]} />
      </section>

      {/* Timeline */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Lifecycle</h2>
        <div className="rounded-2xl border border-border bg-card p-4">
          <LifecycleTimeline history={c.status_history} />
        </div>
      </section>

      {/* Verify dialogs */}
      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog === 'yes' ? 'Confirm resolution' : 'Report unresolved issue'}</DialogTitle>
            <DialogDescription>
              {dialog === 'yes' ? 'Rate how satisfied you are with the resolution.' : 'Tell the department why this isn\'t resolved. It will be reopened.'}
            </DialogDescription>
          </DialogHeader>
          {dialog === 'yes' && (
            <div className="flex flex-col items-center gap-2 py-2">
              <RatingStars value={rating} onChange={setRating} size="lg" />
              <span className="text-sm text-muted-foreground">{rating} / 5</span>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>{dialog === 'yes' ? 'Comment (optional)' : 'Reason'}</Label>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3}
              placeholder={dialog === 'yes' ? 'Great work by the team…' : 'e.g. The leak is still there…'} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)}>Cancel</Button>
            {dialog === 'yes' ? (
              <Button onClick={() => doVerify(true)} disabled={busy} className="gap-2 bg-success text-success-foreground hover:bg-success/90">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />} Confirm resolved
              </Button>
            ) : (
              <Button onClick={() => doVerify(false)} disabled={busy || !comment.trim()} variant="destructive" className="gap-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsDown className="h-4 w-4" />} Reopen complaint
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
