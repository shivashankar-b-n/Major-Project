import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, Camera, Cpu, Route, CheckCircle2, ShieldCheck, BarChart3,
  MapPin, Layers, Building2, Users, Languages,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/common/Logo';
import { DEPARTMENTS, DEPARTMENT_META } from '@/lib/constants';
import { useAuth, homePathForRole } from '@/contexts/AuthContext';

const HERO = 'https://images.pexels.com/photos/34842268/pexels-photo-34842268.jpeg';
const CITIZEN_IMG = 'https://images.unsplash.com/photo-1507537064587-464384459bb7?auto=format&fit=crop&w=1200&q=80';
const CONTROL_IMG = 'https://images.unsplash.com/photo-1685720543547-cc4873188c75?auto=format&fit=crop&w=1200&q=80';

const STEPS = [
  { icon: Camera, title: 'Report', text: 'Snap a photo, add a voice note or text, and pin the location.' },
  { icon: Cpu, title: 'AI Analysis', text: 'AI classifies the issue, estimates priority and flags duplicates.' },
  { icon: Route, title: 'Auto-Routing', text: 'The complaint is routed to the right department instantly.' },
  { icon: CheckCircle2, title: 'Resolve & Verify', text: 'Officers fix it, upload evidence, and you verify the result.' },
];

const FEATURES = [
  { icon: Cpu, title: 'AI issue triage', text: 'Photo + text + location analysed to detect the issue, department and priority — as a reviewable recommendation.' },
  { icon: Layers, title: 'Duplicate grouping', text: 'Multiple reports of the same incident are grouped into one master while keeping every citizen report.' },
  { icon: MapPin, title: 'City map & hotspots', text: 'Live complaint markers, priority overlays and emerging hotspots across wards.' },
  { icon: ShieldCheck, title: 'SLA & escalation', text: 'Per-department SLA timers with automatic escalation when work stalls.' },
  { icon: BarChart3, title: '12-hour intelligence', text: 'Automated city and department reports with trends and recommended actions.' },
  { icon: Languages, title: 'Multilingual ready', text: 'Built on translation keys — English today, Kannada & Hindi next.' },
];

const ROLES = [
  { icon: Users, title: 'Citizens', text: 'Report issues, track the full lifecycle and verify resolutions.', img: CITIZEN_IMG },
  { icon: Building2, title: 'Department Officers', text: 'Triage, assign, resolve and submit evidence with SLA visibility.', img: CONTROL_IMG },
];

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => { if (user) navigate(homePathForRole(user.role)); }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 lg:px-6">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
            <a href="#features" className="transition-colors hover:text-foreground">Platform</a>
            <a href="#departments" className="transition-colors hover:text-foreground">Departments</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate('/login')}>Log in</Button>
            <Button onClick={() => navigate('/register')} className="gap-1.5">
              Get started <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex min-h-[92vh] items-center overflow-hidden pt-16">
        <div className="absolute inset-0">
          <img src={HERO} alt="Aerial view of a modern city" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-hero" />
        </div>
        <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 lg:px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))]" /> AI-powered civic intelligence
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
              Report a city issue.<br />Watch it get resolved.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
              CivicPulse connects citizens with civic departments. AI understands your report, routes it to the
              right team, and you track every step — all the way to verified resolution.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" onClick={() => navigate('/register')} className="gap-2 text-base">
                <Camera className="h-5 w-5" /> Report an issue
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/login')}
                className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                Explore the platform
              </Button>
            </div>
            <div className="mt-10 grid max-w-lg grid-cols-3 gap-6">
              {[['7', 'Departments'], ['AI', 'Triage engine'], ['24/7', 'Reporting']].map(([v, l]) => (
                <div key={l}>
                  <div className="font-display text-2xl font-bold text-white">{v}</div>
                  <div className="text-xs text-white/70">{l}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-20 lg:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">How it works</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-foreground sm:text-4xl">From report to resolution</h2>
          <p className="mt-3 text-muted-foreground">A transparent, four-step lifecycle keeping citizens in the loop.</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="relative flex flex-col rounded-2xl border border-border bg-card p-6 card-shadow">
              <span className="absolute right-5 top-5 font-mono text-sm font-bold text-border">0{i + 1}</span>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="h-5.5 w-5.5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-foreground">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-y border-border bg-gradient-subtle">
        <div className="mx-auto max-w-6xl px-4 py-20 lg:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Platform</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-foreground sm:text-4xl">Built like serious city infrastructure</h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex flex-col rounded-2xl border border-border bg-card p-6 card-shadow transition-all hover:-translate-y-1 hover:shadow-elevated">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">
                  <f.icon className="h-5.5 w-5.5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="mx-auto max-w-6xl px-4 py-20 lg:px-6">
        <div className="grid gap-6 md:grid-cols-2">
          {ROLES.map((r) => (
            <div key={r.title} className="group relative overflow-hidden rounded-3xl border border-border card-shadow">
              <img src={r.img} alt={r.title} className="h-72 w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(217_48%_11%)] via-[hsl(217_48%_11%/0.35)] to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur">
                  <r.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-display text-2xl font-bold text-white">{r.title}</h3>
                <p className="mt-1 max-w-md text-sm text-white/85">{r.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Departments */}
      <section id="departments" className="border-y border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-20 lg:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Coverage</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-foreground sm:text-4xl">Seven core civic departments</h2>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {DEPARTMENTS.map((d) => {
              const meta = DEPARTMENT_META[d];
              const Icon = meta.icon;
              return (
                <div key={d} className="flex items-center gap-3 rounded-xl border border-border bg-background p-4 transition-colors hover:border-primary/40">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${meta.chip}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-semibold text-foreground">{d}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 lg:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-sidebar px-6 py-14 text-center sm:px-12">
          <div className="absolute inset-0 bg-grid opacity-[0.06]" />
          <div className="relative">
            <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">Help build a more responsive city</h2>
            <p className="mx-auto mt-3 max-w-xl text-white/80">Create an account and report your first issue in under a minute.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" onClick={() => navigate('/register')} className="gap-2">Get started <ArrowRight className="h-4 w-4" /></Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/login')}
                className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">Log in</Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row lg:px-6">
          <Logo size="sm" />
          <p>CivicPulse · Prototype for demonstration & research. Uses fictional demo data.</p>
        </div>
      </footer>
    </div>
  );
}
