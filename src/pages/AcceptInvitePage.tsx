import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, Button, Card, Input, PasswordInput, LanguageSwitcher, Spinner, useAuth, useI18n, useApiErrorMessage, isStrongPassword, ApiError } from '@iclever/frontend-kit';

interface InvitationInfo {
  email: string;
  role: string;
  org_name?: string;
  requires_existing_password: boolean;
  first_name: string;
  last_name: string;
}

/** Landing page for invitation links: lets the invitee set a password and join the organization. */
export const AcceptInvitePage: React.FC = () => {
  const { t } = useI18n();
  const { acceptInvitation, changeLocale, isAuthenticated, logout } = useAuth();
  const errorMessage = useApiErrorMessage();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [info, setInfo] = useState<InvitationInfo | null>(null);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoadError({ code: 'INVITATION_INVALID', message: '' });
      return;
    }
    let cancelled = false;
    api.get<InvitationInfo>(`/identity/invitations/${encodeURIComponent(token)}`, { noCache: true }).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        setInfo(res.data);
        setFirstName(res.data.first_name);
        setLastName(res.data.last_name);
      } else {
        setLoadError(res.error ?? { code: 'INVITATION_INVALID', message: '' });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!info || isLoading) return;
    setError('');
    setFieldError('');
    if (!info.requires_existing_password) {
      if (!firstName.trim() || !lastName.trim()) return setFieldError(t('auth.validation.required'));
      if (!isStrongPassword(password)) return setFieldError(t('auth.validation.password'));
    }
    setIsLoading(true);
    if (isAuthenticated) await logout();
    const res = await acceptInvitation({ token, password, first_name: firstName.trim(), last_name: lastName.trim() });
    setIsLoading(false);
    if (res.ok) navigate('/corporate/dashboard', { replace: true });
    else setError(errorMessage(res.error));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher onChange={(loc) => void changeLocale(loc)} />
        </div>
        <Card>
          {!info && !loadError && <Spinner className="py-8" />}
          {loadError && (
            <div className="text-center space-y-3 py-4">
              <h1 className="text-lg font-bold text-slate-900">{t('auth.invite.invalidTitle')}</h1>
              <p className="text-sm text-slate-500">{errorMessage(loadError)}</p>
              <Link to="/login" className="text-indigo-600 text-sm font-medium hover:underline">
                {t('auth.invite.toLogin')}
              </Link>
            </div>
          )}
          {info && (
            <form onSubmit={handleSubmit} className="space-y-3" noValidate>
              <div>
                <h1 className="text-lg font-bold text-slate-900">{t('auth.invite.title', { org: info.org_name ?? '' })}</h1>
                <p className="text-xs text-slate-500 mt-1">{t('auth.invite.subtitle', { email: info.email, role: t(`roles.${info.role}`) })}</p>
              </div>
              {error && (
                <div role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  {error}
                </div>
              )}
              {info.requires_existing_password ? (
                <PasswordInput label={t('auth.invite.existingPassword')} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input label={t('auth.fields.firstName')} value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={100} required />
                    <Input label={t('auth.fields.lastName')} value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={100} required />
                  </div>
                  <PasswordInput
                    label={t('auth.invite.newPassword')}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    helperText={t('auth.validation.passwordHint')}
                    required
                  />
                </>
              )}
              {fieldError && <p role="alert" className="text-xs text-red-600">{fieldError}</p>}
              <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
                {t('auth.invite.submit')}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};
