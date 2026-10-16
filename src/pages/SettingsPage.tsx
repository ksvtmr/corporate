import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Save, Plus, X, History, RotateCcw } from 'lucide-react';
import {
  api,
  Button,
  Card,
  ErrorState,
  Input,
  LOCALE_LABELS,
  Spinner,
  SUPPORTED_LOCALES,
  useApiErrorMessage,
  useI18n,
  useToast,
  ApiError,
  DOMAIN_RE,
} from '@iclever/frontend-kit';

interface Organization {
  id: string;
  name: string;
  legal_name?: string;
  allowed_domains: string[];
  brand_color: string;
  timezone: string;
  default_locale: string;
}

interface Quota {
  plan_name: string;
  max_seats: number;
  used_seats: number;
  storage_limit_mb: number;
  storage_used_mb: number;
}

interface AuditEntry {
  id: string;
  actor_name: string;
  action: string;
  created_at: string;
}

type FormState = Omit<Organization, 'id'>;

const TIMEZONES = ['UTC+6', 'UTC+5', 'UTC+3', 'UTC+0'];
const toForm = (o: Organization): FormState => ({
  name: o.name || '',
  legal_name: o.legal_name || '',
  brand_color: o.brand_color || '#4F46E5',
  timezone: o.timezone || 'UTC+5',
  default_locale: o.default_locale || 'ru',
  allowed_domains: o.allowed_domains || [],
});

export const SettingsPage: React.FC = () => {
  const { t, has, formatDate, formatFileSize, formatPercent } = useI18n();
  const toast = useToast();
  const errorMessage = useApiErrorMessage();
  const [saved, setSaved] = useState<FormState | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [newDomain, setNewDomain] = useState('');
  const [domainError, setDomainError] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    const [orgRes, quotaRes, auditRes] = await Promise.all([
      api.get<Organization>('/corporate/organizations/current', { noCache: true }),
      api.get<Quota>('/corporate/organizations/settings', { noCache: true }),
      api.get<AuditEntry[]>('/corporate/audit-log?limit=8', { noCache: true }),
    ]);
    if (orgRes.success && orgRes.data) {
      const f = toForm(orgRes.data);
      setSaved(f);
      setForm(f);
      setLoadError(null);
    } else {
      setLoadError(orgRes.error ?? null);
    }
    if (quotaRes.success && quotaRes.data) setQuota(quotaRes.data);
    if (auditRes.success && auditRes.data) setAudit(auditRes.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const isDirty = useMemo(() => !!form && !!saved && JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);

  // Warn before leaving with unsaved changes (tab close / reload).
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  if (loadError) return <ErrorState message={errorMessage(loadError, 'errors.loadFailed')} onRetry={() => void load()} />;
  if (!form) return <Spinner className="py-16" />;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const handleAddDomain = () => {
    const domain = newDomain.trim().toLowerCase().replace(/^@/, '');
    if (!domain) return;
    if (!DOMAIN_RE.test(domain)) return setDomainError(t('settings.domains.invalid'));
    if (form.allowed_domains.includes(domain)) return setDomainError(t('settings.domains.duplicate'));
    update('allowed_domains', [...form.allowed_domains, domain]);
    setNewDomain('');
    setDomainError('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setFormError('');
    if (!/^#[0-9a-fA-F]{6}$/.test(form.brand_color)) return setFormError(t('errors.rules.color'));
    setIsSaving(true);
    const res = await api.put<Organization>('/corporate/organizations/current', { ...form, legal_name: form.legal_name || undefined });
    setIsSaving(false);
    if (res.success && res.data) {
      const f = toForm(res.data);
      setSaved(f);
      setForm(f);
      toast.success(t('settings.saved'));
      const auditRes = await api.get<AuditEntry[]>('/corporate/audit-log?limit=8', { noCache: true });
      if (auditRes.success && auditRes.data) setAudit(auditRes.data);
    } else {
      setFormError(errorMessage(res.error));
    }
  };

  const seatsPercent = quota ? (quota.used_seats / Math.max(quota.max_seats, 1)) * 100 : 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('settings.title')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('settings.subtitle')}</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6" noValidate>
        {formError && (
          <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {formError}
          </div>
        )}
        <Card title={t('settings.profile.title')} subtitle={t('settings.profile.subtitle')}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label={t('settings.profile.name')} value={form.name} onChange={(e) => update('name', e.target.value)} maxLength={120} required />
              <Input label={t('settings.profile.legalName')} placeholder={t('settings.profile.legalNamePlaceholder')} value={form.legal_name} onChange={(e) => update('legal_name', e.target.value)} maxLength={200} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="brand-color" className="block text-xs font-medium text-slate-700 mb-1">
                  {t('settings.profile.brandColor')}
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    aria-label={t('settings.profile.brandColor')}
                    value={/^#[0-9a-fA-F]{6}$/.test(form.brand_color) ? form.brand_color : '#4F46E5'}
                    onChange={(e) => update('brand_color', e.target.value.toUpperCase())}
                    className="w-9 h-9 p-0.5 border border-slate-300 rounded-lg cursor-pointer shrink-0"
                  />
                  <input
                    id="brand-color"
                    type="text"
                    value={form.brand_color}
                    maxLength={7}
                    onChange={(e) => update('brand_color', e.target.value)}
                    className="w-full text-xs font-mono rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="org-tz" className="block text-xs font-medium text-slate-700 mb-1">
                  {t('settings.profile.timezone')}
                </label>
                <select id="org-tz" value={form.timezone} onChange={(e) => update('timezone', e.target.value)} className="w-full text-sm rounded-lg border border-slate-300 bg-white p-2">
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {t(`settings.timezones.${tz.replace('+', 'p')}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="org-locale" className="block text-xs font-medium text-slate-700 mb-1">
                  {t('settings.profile.defaultLocale')}
                </label>
                <select id="org-locale" value={form.default_locale} onChange={(e) => update('default_locale', e.target.value)} className="w-full text-sm rounded-lg border border-slate-300 bg-white p-2">
                  {SUPPORTED_LOCALES.map((loc) => (
                    <option key={loc} value={loc} lang={loc}>
                      {LOCALE_LABELS[loc].native} ({loc})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">{t('settings.profile.defaultLocaleHint')}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card title={t('settings.domains.title')} subtitle={t('settings.domains.subtitle')}>
          <div className="space-y-3">
            <ul className="flex flex-wrap gap-2" aria-label={t('settings.domains.title')}>
              {form.allowed_domains.map((domain) => (
                <li key={domain} className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                  @{domain}
                  <button type="button" onClick={() => update('allowed_domains', form.allowed_domains.filter((d) => d !== domain))} className="ml-1.5 text-slate-400 hover:text-red-600" aria-label={t('settings.domains.remove', { domain })}>
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
              {form.allowed_domains.length === 0 && <li className="text-xs text-amber-700">{t('settings.domains.empty')}</li>}
            </ul>
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 pt-2">
              <div className="w-full sm:max-w-xs">
                <Input
                  placeholder={t('settings.domains.placeholder')}
                  aria-label={t('settings.domains.add')}
                  value={newDomain}
                  error={domainError || undefined}
                  onChange={(e) => {
                    setNewDomain(e.target.value);
                    setDomainError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddDomain();
                    }
                  }}
                />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddDomain} className="sm:mt-0.5">
                <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
                {t('settings.domains.add')}
              </Button>
            </div>
          </div>
        </Card>

        {quota && (
          <Card title={t('settings.plan.title')} subtitle={t('settings.plan.subtitle')}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-500">{t('settings.plan.plan')}</span>
                <p className="text-base font-bold text-slate-900 mt-0.5">{quota.plan_name}</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-500">{t('settings.plan.seats')}</span>
                <p className="text-base font-bold text-slate-900 mt-0.5">{t('settings.plan.seatsValue', { used: quota.used_seats, max: quota.max_seats })}</p>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1" role="progressbar" aria-valuenow={Math.round(seatsPercent)} aria-valuemin={0} aria-valuemax={100}>
                  <div className={`h-full ${seatsPercent > 90 ? 'bg-red-500' : 'bg-indigo-600'}`} style={{ width: `${Math.min(seatsPercent, 100)}%` }} />
                </div>
                <span className="text-[10px] text-slate-500">{formatPercent(seatsPercent)}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-500">{t('settings.plan.storage')}</span>
                <p className="text-base font-bold text-slate-900 mt-0.5">
                  {formatFileSize(quota.storage_used_mb)} / {formatFileSize(quota.storage_limit_mb)}
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-3 sticky bottom-0 bg-slate-50/90 backdrop-blur py-3">
          {isDirty && <span className="text-xs font-medium text-amber-700">{t('common.states.unsavedChanges')}</span>}
          {isDirty && (
            <Button type="button" variant="ghost" onClick={() => setForm(saved)} disabled={isSaving}>
              <RotateCcw className="w-4 h-4 mr-1.5" aria-hidden="true" />
              {t('settings.discard')}
            </Button>
          )}
          <Button type="submit" variant="primary" isLoading={isSaving} disabled={!isDirty}>
            <Save className="w-4 h-4 mr-1.5" aria-hidden="true" />
            {t('common.actions.saveChanges')}
          </Button>
        </div>
      </form>

      <Card title={t('settings.audit.title')} subtitle={t('settings.audit.subtitle')}>
        {audit.length === 0 ? (
          <p className="text-xs text-slate-400">{t('settings.audit.empty')}</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-xs">
            {audit.map((entry) => (
              <li key={entry.id} className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="flex items-center gap-2 text-slate-700">
                  <History className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                  <span>
                    <strong className="font-semibold">{entry.actor_name}</strong> — {has(`settings.audit.actions.${entry.action}`) ? t(`settings.audit.actions.${entry.action}`) : entry.action}
                  </span>
                </span>
                <time dateTime={entry.created_at} className="text-slate-400">
                  {formatDate(entry.created_at, 'dateTime')}
                </time>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};
