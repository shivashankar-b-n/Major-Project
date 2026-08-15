import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, FileText, Bell, User, Plus } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { notificationApi } from '@/lib/api';
import { initials } from '@/lib/format';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/app', icon: Home, key: 'nav_home', end: true },
  { to: '/app/complaints', icon: FileText, key: 'nav_reports' },
  { to: '/app/report', icon: Plus, key: 'report', center: true },
  { to: '/app/notifications', icon: Bell, key: 'nav_notifications' },
  { to: '/app/profile', icon: User, key: 'nav_profile' },
];

export const CitizenShell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    const load = () => notificationApi.list().then((n) => active && setUnread(n.filter((x) => !x.read).length)).catch(() => {});
    load();
    const id = setInterval(load, 20000);
    return () => { active = false; clearInterval(id); };
  }, []);

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-background shadow-xl">
        {/* App bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
          <Logo size="sm" />
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate('/app/notifications')}
              className="relative grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-secondary"
              aria-label="Notifications"
            >
              <Bell className="h-4.5 w-4.5" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {unread}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate('/app/profile')}
              className="grid h-9 w-9 place-items-center rounded-full bg-gradient-brand text-xs font-bold text-primary-foreground"
              aria-label="Profile"
            >
              {initials(user?.name)}
            </button>
          </div>
        </header>

        <main className="flex-1 pb-24">
          <Outlet />
        </main>

        {/* Bottom navigation */}
        <nav className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-[480px] -translate-x-1/2 items-center justify-around border-t border-border bg-background/95 px-2 py-2 backdrop-blur">
          {NAV.map((item) => {
            const Icon = item.icon;
            if (item.center) {
              return (
                <NavLink key={item.to} to={item.to} className="relative -mt-8" aria-label={t('report_issue')}>
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-gradient-brand text-primary-foreground shadow-glow ring-4 ring-background transition-transform hover:scale-105 active:scale-95">
                    <Icon className="h-6 w-6" strokeWidth={2.5} />
                  </span>
                </NavLink>
              );
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn('relative flex w-16 flex-col items-center gap-0.5 rounded-lg py-1 text-[10px] font-medium transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {item.key === 'nav_notifications' && unread > 0 && (
                    <span className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full bg-destructive" />
                  )}
                </span>
                {t(item.key, item.key)}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
