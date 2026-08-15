import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ChevronLeft, MapPin, Cpu, User, ImageIcon, Play, ArrowUpCircle, XCircle,
  UploadCloud, Loader2, CheckCircle2, StickyNote, Wrench, Layers, ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge, PriorityBadge, DepartmentChip } from '@/components/common/Badges';
import { LifecycleTimeline } from '@/components/common/LifecycleTimeline';
import { ConfidenceMeter } from '@/components/common/ConfidenceMeter';
import { StylizedCityMap } from '@/components/common/StylizedCityMap';
import { PageLoader } from '@/components/common/Loaders';
import { complaintApi } from '@/lib/api';
import { formatDate, fileToCompressedBase64, dueLabel } from '@/lib/format';
import { cn } from '@/lib/utils';

const STATUS_OPTS = ['NEW', 'ROUTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLUTION_SUBMITTED', 'RESOLVED', 'ESCALATED', 'REJECTED', 'REOPENED'];

export default function ComplaintWork({ backTo }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [c, setC] = useState(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [manualStatus, setManualStatus] = useState('');
  const [workNote, setWorkNote] = useState('');
  const [beforeImg, setBeforeImg] = useState(null);
  const [afterImg, setAfterImg] = useState(null);
  const beforeRef = useRef(null);
  const afterRef = useRef(null);

  const load = useCallback(() => complaintApi.get(id).then((d) => { setC(d); setManualStatus(d.status); }).catch(() => { toast.error('Could not load'); navigate(backTo); }), [id, navigate, backTo]);
  useEffect(() => { load(); }, [load]);

  if (!c) return <PageLoader label="Loading complaint…" />;

  const isClosed = ['RESOLVED', 'REJECTED', 'CANCELLED'].includes(c.status);
  const evidenceImg = c.media?.find((m) => m.type === 'image' && m.data)?.data;
  const due = dueLabel(c.sla?.due_at);

  const run = async (fn, msg) => {
    setBusy(true);
    try { await fn(); toast.success(msg); load(); }
    catch (err) { toast.error(err?.response?.data?.detail || 'Action failed'); }
    finally { setBusy(false); }
  };

  const assignMe = () => run(() => complaintApi.assign(id, {}), 'Assigned to you');
  const setStatus = (status, n) => run(() => complaintApi.status(id, { status, note: n }), `Status → ${status.replace('_', ' ')}`);
  const addNote = () => { if (!note.trim()) return; run(() => complaintApi.status(id, { status: c.status, note }), 'Note added').then(() => setNote('')); };
  const submitResolution = () => {
    if (!workNote.trim() && !afterImg) { toast.error('Add a work note or an “after” photo'); return; }
    run(() => complaintApi.resolution(id, { before_image: beforeImg, after_image: afterImg, work_note: workNote }), 'Resolution submitted for citizen verification')
      .then(() => { setWorkNote(''); setBeforeImg(null); setAfterImg(null); });
  };

  const pick = (setter) => async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    try { setter(await fileToCompressedBase64(f)); } catch { toast.error('Could not read image'); }
  };

  return (
    <div className="space-y-5">
      <button onClick={() => navigate(backTo)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Back to list
      </button>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* LEFT: details */}
        <div className="space-y-5 lg:col-span-2">
          <div className="rounded-2xl border border-border bg-card p-5 card-shadow">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-muted-foreground">{c.tracking_id}</span>
              {c.linked_reports > 1 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent"><Layers className="h-3 w-3" /> {c.linked_reports} linked</span>
              )}
            </div>
            <h1 className="mt-1 font-display text-xl font-bold text-foreground">{c.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={c.status} /><PriorityBadge priority={c.priority} /><DepartmentChip department={c.department} short />
              {!isClosed && due.text !== 'No SLA' && (
                <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', due.breached ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-muted-foreground')}>
                  SLA: {due.text}
                </span>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" /> Reported by <span className="font-medium text-foreground">{c.citizen_name || 'Citizen'}</span> · {formatDate(c.created_at, true)}
            </div>
            {c.description && <p className="mt-3 rounded-xl bg-muted/50 p-3 text-sm text-foreground">{c.description}</p>}
          </div>

          {/* Evidence */}
          <div className="rounded-2xl border border-border bg-card p-5 card-shadow">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Citizen evidence</h3>
            <div className="mt-3">
              {evidenceImg ? <img src={evidenceImg} alt="evidence" className="h-64 w-full rounded-xl border border-border object-cover" />
                : <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 text-muted-foreground"><ImageIcon className="h-8 w-8" /><span className="mt-1 text-sm">Photo evidence on file</span></div>}
            </div>
          </div>

          {/* AI */}
          {c.ai_prediction && (
            <div className="rounded-2xl border border-border bg-card p-5 card-shadow">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground"><Cpu className="h-4 w-4" /> AI analysis</h3>
              <p className="mt-2 text-sm text-foreground">{c.ai_prediction.reasoning}</p>
              <div className="mt-3"><ConfidenceMeter value={c.ai_prediction.confidence} source={c.ai_prediction.source} /></div>
            </div>
          )}

          {/* Location */}
          <div className="rounded-2xl border border-border bg-card p-5 card-shadow">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground"><MapPin className="h-4 w-4" /> Location</h3>
            <p className="mt-2 text-sm text-foreground">{c.location?.address}</p>
            <div className="mt-3"><StylizedCityMap height={220} showHotspots={false} points={[{ id: c.id, title: c.title, priority: c.priority, department: c.department, location: c.location }]} /></div>
          </div>

          {/* Timeline */}
          <div className="rounded-2xl border border-border bg-card p-5 card-shadow">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Lifecycle</h3>
            <div className="mt-4"><LifecycleTimeline history={c.status_history} /></div>
          </div>
        </div>

        {/* RIGHT: actions */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {/* Assignment */}
          <div className="rounded-2xl border border-border bg-card p-4 card-shadow">
            <h3 className="text-sm font-semibold text-foreground">Assignment</h3>
            {c.assigned_officer_name ? (
              <div className="mt-2 flex items-center gap-2 rounded-xl bg-secondary/60 p-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{c.assigned_officer_name.split(' ').map((x) => x[0]).slice(0, 2).join('')}</span>
                <span className="text-sm font-medium text-foreground">{c.assigned_officer_name}</span>
              </div>
            ) : (
              <Button className="mt-2 w-full gap-2" disabled={busy || isClosed} onClick={assignMe}><User className="h-4 w-4" /> Assign to me</Button>
            )}
          </div>

          {/* Quick actions */}
          {!isClosed && (
            <div className="rounded-2xl border border-border bg-card p-4 card-shadow">
              <h3 className="text-sm font-semibold text-foreground">Actions</h3>
              <div className="mt-3 grid gap-2">
                {['ASSIGNED', 'REOPENED'].includes(c.status) && (
                  <Button variant="outline" className="justify-start gap-2" disabled={busy} onClick={() => setStatus('IN_PROGRESS', 'Field team dispatched')}><Play className="h-4 w-4" /> Start work</Button>
                )}
                {c.status !== 'ESCALATED' && (
                  <Button variant="outline" className="justify-start gap-2 text-destructive" disabled={busy} onClick={() => setStatus('ESCALATED', 'Escalated to senior officer')}><ArrowUpCircle className="h-4 w-4" /> Escalate</Button>
                )}
                <Button variant="ghost" className="justify-start gap-2 text-muted-foreground" disabled={busy} onClick={() => setStatus('REJECTED', 'Rejected — out of scope / invalid')}><XCircle className="h-4 w-4" /> Reject</Button>
              </div>

              {/* manual status */}
              <div className="mt-3 space-y-1.5">
                <Label className="text-xs">Manual status</Label>
                <div className="flex gap-2">
                  <Select value={manualStatus} onValueChange={setManualStatus}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS_OPTS.map((s) => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button size="sm" variant="secondary" disabled={busy || manualStatus === c.status} onClick={() => setStatus(manualStatus, 'Status manually updated')}>Set</Button>
                </div>
              </div>
            </div>
          )}

          {/* Resolution */}
          {!isClosed && ['IN_PROGRESS', 'ESCALATED', 'REOPENED', 'ASSIGNED'].includes(c.status) && (
            <div className="rounded-2xl border border-primary/25 bg-primary/[0.03] p-4">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><Wrench className="h-4 w-4 text-primary" /> Submit resolution</h3>
              <p className="mt-1 text-xs text-muted-foreground">Evidence is required — add a work note and/or an “after” photo. The citizen must verify.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[['Before', beforeImg, setBeforeImg, beforeRef], ['After', afterImg, setAfterImg, afterRef]].map(([lbl, val, setter, ref]) => (
                  <div key={lbl}>
                    <input ref={ref} type="file" accept="image/*" className="hidden" onChange={pick(setter)} />
                    {val ? (
                      <button onClick={() => ref.current?.click()} className="relative h-20 w-full overflow-hidden rounded-lg border border-border"><img src={val} alt={lbl} className="h-full w-full object-cover" /></button>
                    ) : (
                      <button onClick={() => ref.current?.click()} className="flex h-20 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-[11px] text-muted-foreground hover:border-primary/40"><UploadCloud className="h-4 w-4" /> {lbl}</button>
                    )}
                  </div>
                ))}
              </div>
              <Textarea value={workNote} onChange={(e) => setWorkNote(e.target.value)} rows={3} placeholder="Describe the work performed…" className="mt-2 resize-none" />
              <Button className="mt-2 w-full gap-2" disabled={busy} onClick={submitResolution}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Submit for verification
              </Button>
            </div>
          )}

          {c.status === 'RESOLUTION_SUBMITTED' && (
            <div className="rounded-2xl border border-priority-high/30 bg-priority-high/[0.06] p-4 text-sm">
              <div className="flex items-center gap-2 font-semibold text-priority-high"><ShieldCheck className="h-4 w-4" /> Awaiting citizen verification</div>
              <p className="mt-1 text-muted-foreground">Resolution submitted. The citizen will confirm or reopen.</p>
            </div>
          )}

          {/* Add note */}
          <div className="rounded-2xl border border-border bg-card p-4 card-shadow">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><StickyNote className="h-4 w-4" /> Internal note</h3>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note to the timeline…" className="mt-2" />
            <Button variant="outline" size="sm" className="mt-2 w-full" disabled={busy || !note.trim()} onClick={addNote}>Add note</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
