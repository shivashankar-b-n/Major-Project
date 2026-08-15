import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ListChecks, Map, BarChart3, Database, FileBarChart,
  Users, LogOut, Menu, X, ShieldCheck,
} from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { initials } from '@/lib/format';
import { DEPARTMENT_META } from '@/lib/constants';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const OFFICER_NAV = [
  { to: '/officer', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/officer/queue', icon: ListChecks, label: 'Complaint Queue' },
  { to: '/officer/map', icon: Map, label: 'Field Map' },
  { to: '/officer/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/officer/reports', icon: FileBarChart, label: 'Reports' },
];

const ADMIN_NAV = [
  { to: '/admin', icon: LayoutDashboard, label: 'Command Center', end: true },
  { to: '/admin/complaints', icon: ListChecks, label: 'All Complaints' },
  { to: '/admin/map', icon: Map, label: 'City Map' },
  { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/admin/reports', icon: FileBarChart, label: 'Intelligence Reports' },
  { to: '/admin/data-sources', icon: Database, label: 'Data Sources' },
  { to: '/admin/users', icon: Users, label: 'Users & Config' },
];

export const DashboardShell = ({ role }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const nav = role === 'admin' ? ADMIN_NAV : OFFICER_NAV;
  const DeptIcon = user?.department ? DEPARTMENT_META[user.department]?.icon : ShieldCheck;

  const doLogout = () => { logout(); navigate('/login'); };

  const SidebarInner = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 py-5">
        <Logo size="sm" tone="light" />
        <button className="text-sidebar-muted lg:hidden" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
      </div>

      <div className="mx-3 mb-4 rounded-xl border border-sidebar-border bg-white/5 px-3 py-2.5">
        <div className="flex items-center gap-2 text-sidebar-foreground">
          {DeptIcon && <DeptIcon className="h-4 w-4 text-sidebar-accent" />}
          <span className="truncate text-sm font-semibold">
            {role === 'admin' ? 'City Administration' : user?.department || 'Department'}
          </span>
        </div>
        <div className="mt-0.5 text-[11px] uppercase tracking-wide text-sidebar-muted">
          {role === 'admin' ? 'Full city oversight' : 'Officer portal'}
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent/15 text-white shadow-[inset_2px_0_0_hsl(var(--sidebar-accent))]'
                    : 'text-sidebar-foreground hover:bg-white/5 hover:text-white')}
            >
              <Icon className="h-4.5 w-4.5" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={doLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4.5 w-4.5" /> Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-muted/40">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 bg-sidebar lg:block">{SidebarInner}</aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-sidebar">{SidebarInner}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button className="grid h-9 w-9 place-items-center rounded-lg border border-border lg:hidden" onClick={() => setOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {role === 'admin' ? 'Administrator' : 'Department Officer'}
              </div>
              <div className="font-display text-base font-semibold leading-tight text-foreground">
                Welcome, {user?.name?.split(' ')[0]}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-3 transition-colors hover:bg-secondary">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-brand text-xs font-bold text-primary-foreground">
                  {initials(user?.name)}
                </span>
                <span className="hidden text-sm font-medium sm:block">{user?.name}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="font-semibold">{user?.name}</div>
                <div className="text-xs font-normal text-muted-foreground">{user?.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={doLogout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
