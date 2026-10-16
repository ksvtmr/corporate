import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, Button, Input, PasswordInput, Card, LanguageSwitcher, useI18n, useApiErrorMessage, isEmail, isStrongPassword } from '@iclever/frontend-kit';

type Field = 'orgName' | 'firstName' | 'lastName' | 'email' | 'password' | 'confirm';

export const RegisterPage: React.FC = () => {
  const { t } = useI18n();
  const { register, changeLocale } = useAuth();
  const errorMessage = useApiErrorMessage();
  const navigate = useNavigate();
  const [form, setForm] = useState({ orgName: '', firstName: '', lastName: '', jobTitle: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((errs) => ({ ...errs, [key]: undefined }));
  };

  const validate = () => {
    const next: Partial<Record<Field, string>> = {};
    if (!form.orgName.trim()) next.orgName = t('auth.validation.required');
    if (!form.firstName.trim()) next.firstName = t('auth.validation.required');
    if (!form.lastName.trim()) next.lastName = t('auth.validation.required');
    if (!isEmail(form.email)) next.email = t('auth.validation.email');
    if (!isStrongPassword(form.password)) next.password = t('auth.validation.password');
    if (form.confirm !== form.password) next.confirm = t('auth.validation.passwordMismatch');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');
    if (!validate()) return;
    setIsLoading(true);
    const res = await register({
      email: form.email.trim(),
      password: form.password,
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      org_name: form.orgName.trim(),
      job_title: form.jobTitle.trim() || undefined,
    });
    setIsLoading(false);
    if (res.ok) navigate('/corporate/dashboard', { replace: true });
    else setError(errorMessage(res.error, 'auth.register.errors.failed'));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher onChange={(loc) => void changeLocale(loc)} />
        </div>
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white font-bold text-2xl mb-3 shadow-md shadow-indigo-200" aria-hidden="true">
            iC
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('auth.register.title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('auth.register.subtitle')}</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-3" noValidate>
            {error && (
              <div role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {error}
              </div>
            )}
            <Input label={t('auth.fields.orgName')} value={form.orgName} onChange={set('orgName')} placeholder={t('auth.register.orgPlaceholder')} error={errors.orgName} maxLength={120} required />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input label={t('auth.fields.firstName')} autoComplete="given-name" value={form.firstName} onChange={set('firstName')} error={errors.firstName} maxLength={100} required />
              <Input label={t('auth.fields.lastName')} autoComplete="family-name" value={form.lastName} onChange={set('lastName')} error={errors.lastName} maxLength={100} required />
            </div>
            <Input label={t('auth.fields.jobTitle')} autoComplete="organization-title" value={form.jobTitle} onChange={set('jobTitle')} placeholder={t('auth.register.jobTitlePlaceholder')} maxLength={120} />
            <Input label={t('auth.fields.email')} type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} required />
            <PasswordInput
              label={t('auth.fields.password')}
              autoComplete="new-password"
              value={form.password}
              onChange={set('password')}
              error={errors.password}
              helperText={t('auth.validation.passwordHint')}
              required
            />
            <PasswordInput label={t('auth.fields.confirmPassword')} autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} required />
            <Button type="submit" variant="primary" className="w-full mt-2" isLoading={isLoading}>
              {t('auth.register.submit')}
            </Button>
            <div className="text-center text-xs text-slate-500 pt-2">
              {t('auth.register.haveAccount')}{' '}
              <Link to="/login" className="text-indigo-600 font-medium hover:underline">
                {t('auth.register.loginLink')}
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
