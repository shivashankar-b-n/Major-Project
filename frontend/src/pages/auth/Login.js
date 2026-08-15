import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, User, Building2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/common/Logo';
import { useAuth, homePathForRole } from '@/contexts/AuthContext';

const DEMO = [
  { role: 'citizen', icon: User, label: 'Citizen', email: 'citizen@smartcity.gov', desc: 'Report & track issues' },
  { role: 'officer', icon: Building2, label: 'Officer', email: 'officer@smartcity.gov', desc: 'Water & Sewage dept' },
  { role: 'admin', icon: ShieldCheck, label: 'Admin', email: 'admin@smartcity.gov', desc: 'City command center' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e, creds) => {
    e?.preventDefault?.();
    const body = creds || { email, password };
    setLoading(true);
    try {
      const u = await login(body);
      toast.success(`Welcome back, ${u.name.split(' ')[0]}`);
      navigate(location.state?.from || homePathForRole(u.role), { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const quick = (email) => { setEmail(email); setPassword('demo1234'); submit(null, { email, password: 'demo1234' }); };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="relative hidden overflow-hidden bg-sidebar lg:block">
        <div className="absolute inset-0 bg-grid opacity-[0.07]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo tone="light" size="lg" />
          <div>
            <h2 className="font-display text-4xl font-bold leading-tight text-white">One platform for a<br />responsive city.</h2>
            <p className="mt-4 max-w-md text-white/75">AI-assisted triage, transparent tracking and verified resolutions across seven civic departments.</p>
          </div>
          <p className="text-xs text-white/50">Prototype · fictional demo data · no real citizen information</p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex flex-col justify-center px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <div className="lg:hidden"><Logo size="md" /></div>
          <h1 className="mt-6 font-display text-2xl font-bold text-foreground">Log in to CivicPulse</h1>
          <p className="mt-1 text-sm text-muted-foreground">Enter your credentials to continue.</p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Log in
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> Quick demo access <span className="h-px flex-1 bg-border" />
          </div>
          <div className="grid gap-2">
            {DEMO.map((d) => (
              <button key={d.role} onClick={() => quick(d.email)} disabled={loading}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-primary/40 hover:shadow-card disabled:opacity-60">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><d.icon className="h-4.5 w-4.5" /></span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-foreground">{d.label}</span>
                  <span className="block text-xs text-muted-foreground">{d.desc}</span>
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">demo1234</span>
              </button>
            ))}
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            New here? <Link to="/register" className="font-semibold text-primary hover:underline">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
