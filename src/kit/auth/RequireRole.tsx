import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { useAuth } from './AuthContext';
import { can, Capability, Role, rolesWith } from './permissions';
import { Button } from '../components/Button';
import { useI18n } from '../i18n/I18nProvider';

export const AccessDenied: React.FC<{ currentRole?: Role; allowedRoles?: Role[] }> = ({ currentRole, allowedRoles }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const roleLabel = (r?: string) => (r ? t(`roles.${r}`) : t('roles.unknown'));

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 text-center">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-5 ring-8 ring-rose-50/50">
          <ShieldAlert className="w-8 h-8" aria-hidden="true" />
        </div>
        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 mb-3">403</div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">{t('auth.accessDenied.title')}</h2>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          {t('auth.accessDenied.message', { role: roleLabel(currentRole) })}{' '}
          <code className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-xs break-all">{location.pathname}</code>
        </p>
        {allowedRoles && allowedRoles.length > 0 && (
          <div className="bg-slate-50 rounded-xl p-3 mb-6 text-left border border-slate-100">
            <span className="text-xs font-medium text-slate-500 block mb-1.5">{t('auth.accessDenied.requiredRoles')}</span>
            <div className="flex flex-wrap gap-1.5">
              {allowedRoles.map((r) => (
                <span key={r} className="text-xs px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded-md font-medium">
                  {roleLabel(r)}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
            {t('common.actions.back')}
          </Button>
          <Button variant="primary" onClick={() => navigate('/corporate/dashboard')}>
            <LayoutDashboard className="w-4 h-4 mr-2" aria-hidden="true" />
            {t('auth.accessDenied.toDashboard')}
          </Button>
        </div>
      </div>
    </div>
  );
};

interface RequireCapabilityProps {
  capability: Capability;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Route guard driven by the shared RBAC matrix. It only hides UI; every
 * endpoint enforces the same capability on the server.
 */
export const RequireCapability: React.FC<RequireCapabilityProps> = ({ capability, children, fallback }) => {
  const { activeMember, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center" role="status" aria-busy="true">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }
  if (!isAuthenticated || !activeMember) return <Navigate to="/login" replace />;
  if (!can(activeMember.role, capability)) {
    if (fallback) return <>{fallback}</>;
    return <AccessDenied currentRole={activeMember.role} allowedRoles={rolesWith(capability).filter((r) => r !== 'platform_super_admin')} />;
  }
  return <>{children}</>;
};
