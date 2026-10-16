import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  useAuth,
  Button,
  Input,
  PasswordInput,
  Card,
  LanguageSwitcher,
  useI18n,
  useApiErrorMessage,
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
  IS_DEMO_MODE,
} from '@iclever/frontend-kit';

/** Only same-app paths are accepted as post-login redirects (no open redirect). */
function safeRedirect(from: unknown): string {
  return typeof from === 'string' && from.startsWith('/corporate/') && !from.startsWith('//') ? from : '/corporate/dashboard';
}

export const LoginPage: React.FC = () => {
  const { t } = useI18n();
  const { login, sessionNotice, changeLocale } = useAuth();
  const errorMessage = useApiErrorMessage();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');
    if (!email.trim() || !password) {
      setError(t('auth.login.errors.required'));
      return;
    }
    setIsLoading(true);
    const res = await login(email, password);
    setIsLoading(false);
    if (res.ok) navigate(safeRedirect((location.state as { from?: string } | null)?.from), { replace: true });
    else setError(errorMessage(res.error, 'auth.login.errors.failed'));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher onChange={(loc) => void changeLocale(loc)} />
        </div>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white font-bold text-2xl mb-3 shadow-md shadow-indigo-200" aria-hidden="true">
            iC
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">iClever Corporate</h1>
          <p className="text-sm text-slate-500 mt-1">{t('auth.login.subtitle')}</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {sessionNotice && !error && (
              <div role="status" className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                {t(`auth.sessionNotice.${sessionNotice}`)}
              </div>
            )}
            {error && (
              <div role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {error}
              </div>
            )}

            <Input label={t('auth.fields.email')} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <PasswordInput label={t('auth.fields.password')} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />

            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
              {t('auth.login.submit')}
            </Button>

            {IS_DEMO_MODE && (
              <div className="pt-3 border-t border-slate-100">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-1">{t('auth.login.demo.title')}</p>
                <p className="text-[11px] text-slate-400 text-center mb-2">{t('auth.login.demo.hint', { password: DEMO_PASSWORD })}</p>
                <div className="space-y-1.5">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => {
                        setEmail(acc.email);
                        setPassword(DEMO_PASSWORD);
                        setError('');
                      }}
                      className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 transition-all flex items-center justify-between group focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-700">
                          {t(`roles.${acc.role}`)} ({acc.name})
                        </span>
                        <p className="text-[10px] text-slate-500 truncate">
                          {acc.email} • {t(`auth.login.demo.scope.${acc.role}`)}
                        </p>
                      </div>
                      <span className="text-[10px] text-indigo-600 font-semibold opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity shrink-0 ml-2">
                        {t('auth.login.demo.select')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="text-center text-xs text-slate-500 pt-2">
              {t('auth.login.noAccount')}{' '}
              <Link to="/register" className="text-indigo-600 font-medium hover:underline">
                {t('auth.login.registerLink')}
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
