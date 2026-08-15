import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/common/Logo';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { DEPARTMENTS } from '@/lib/constants';
import { useAuth, homePathForRole } from '@/contexts/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'citizen', department: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.role === 'officer' && !form.department) { toast.error('Please select a department'); return; }
    setLoading(true);
    try {
      const u = await register({ ...form, department: form.role === 'officer' ? form.department : undefined });
      toast.success('Account created. Welcome to CivicPulse!');
      navigate(homePathForRole(u.role), { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-5 py-10 sm:px-10 lg:order-1">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <div className="lg:hidden"><Logo size="md" /></div>
          <h1 className="mt-6 font-display text-2xl font-bold text-foreground">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Join CivicPulse to report and track civic issues.</p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" required value={form.name} onChange={(e) => set('name')(e.target.value)} placeholder="Your name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={form.email} onChange={(e) => set('email')(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required minLength={6} value={form.password} onChange={(e) => set('password')(e.target.value)} placeholder="Min 6 chars" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input id="phone" value={form.phone} onChange={(e) => set('phone')(e.target.value)} placeholder="+91…" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Account type</Label>
              <Select value={form.role} onValueChange={set('role')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="citizen">Citizen</SelectItem>
                  <SelectItem value="officer">Department Officer</SelectItem>
                  <SelectItem value="admin">City Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.role === 'officer' && (
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select value={form.department} onValueChange={set('department')}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.role !== 'citizen' && (
              <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                In production, officer &amp; admin accounts are provisioned by the city. Open here for demo exploration.
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/login" className="font-semibold text-primary hover:underline">Log in</Link>
          </p>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-sidebar lg:order-2 lg:block">
        <div className="absolute inset-0 bg-grid opacity-[0.07]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex justify-end"><Logo tone="light" size="lg" /></div>
          <div>
            <h2 className="font-display text-4xl font-bold leading-tight text-white">Your voice shapes<br />the city.</h2>
            <p className="mt-4 max-w-md text-white/75">Every report you file helps departments respond faster and smarter.</p>
          </div>
          <p className="text-xs text-white/50">Prototype · fictional demo data</p>
        </div>
      </div>
    </div>
  );
}
