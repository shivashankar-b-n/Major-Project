import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { LogOut, Globe, Bell, Shield, ChevronRight, Mail, Phone, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DemoBadge } from '@/components/common/DemoBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useLang } from '@/contexts/LanguageContext';
import { LANGUAGES } from '@/lib/constants';
import { t } from '@/lib/i18n';
import { initials } from '@/lib/format';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { lang, setLang } = useLang();

  const changeLang = (l) => {
    setLang(l);
    toast.success(t('language_updated'));
  };

  const doLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="space-y-5 px-4 py-5">
      <h1 className="font-display text-2xl font-bold text-foreground">{t('profile')}</h1>

      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 card-shadow">
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-brand text-xl font-bold text-primary-foreground">{initials(user?.name)}</span>
        <div className="min-w-0">
          <div className="font-display text-lg font-bold text-foreground">{user?.name}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground"><Mail className="h-3.5 w-3.5" /> {user?.email}</div>
          {user?.phone && <div className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground"><Phone className="h-3.5 w-3.5" /> {user.phone}</div>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5"><Globe className="h-4 w-4" /> {t('language')}</Label>
        <Select value={lang} onValueChange={changeLang}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((l) => <SelectItem key={l.code} value={l.code}>{l.label} · {l.native}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between p-4">
          <span className="flex items-center gap-3"><Bell className="h-4.5 w-4.5 text-muted-foreground" /> <span className="text-sm font-medium">{t('push_notifications')}</span></span>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between p-4">
          <span className="flex items-center gap-3"><Shield className="h-4.5 w-4.5 text-muted-foreground" /> <span className="text-sm font-medium">{t('share_location')}</span></span>
          <Switch defaultChecked />
        </div>
        <button className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-secondary/50">
          <span className="flex items-center gap-3"><Info className="h-4.5 w-4.5 text-muted-foreground" /> <span className="text-sm font-medium">{t('about')}</span></span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
        <span className="text-xs text-muted-foreground">{t('demo_account')}</span>
        <DemoBadge label="Demo" />
      </div>

      <Button variant="outline" onClick={doLogout} className="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/5">
        <LogOut className="h-4 w-4" /> {t('logout')}
      </Button>
    </div>
  );
}
