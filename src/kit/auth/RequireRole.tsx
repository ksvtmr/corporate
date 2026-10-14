import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { useAuth, OrgMember } from './AuthContext';
import { Button } from '../components/Button';

interface RequireRoleProps {
  allowedRoles: Array<OrgMember['role']>;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const AccessDenied: React.FC<{ currentRole?: string; allowedRoles?: string[] }> = ({
  currentRole,
  allowedRoles,
}) => {
  const location = useLocation();

  const getRoleLabel = (r?: string) => {
    switch (r) {
      case 'platform_super_admin':
        return 'Супер-администратор платформы';
      case 'org_admin':
        return 'Администратор организации';
      case 'hr_manager':
        return 'HR / Менеджер обучения';
      case 'manager':
        return 'Руководитель подразделения';
      case 'trainer':
        return 'Корпоративный тренер / Методист';
      case 'employee':
        return 'Сотрудник';
      default:
        return r || 'Не определена';
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-5 ring-8 ring-rose-50/50">
          <ShieldAlert className="w-8 h-8" />
        </div>
        
        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 mb-3">
          403 Forbidden
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Доступ ограничен
        </h2>

        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          У вашей учетной записи с ролью <span className="font-semibold text-slate-800">«{getRoleLabel(currentRole)}»</span> недостаточно прав для просмотра раздела <code className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-xs">{location.pathname}</code>.
        </p>

        {allowedRoles && allowedRoles.length > 0 && (
          <div className="bg-slate-50 rounded-xl p-3 mb-6 text-left border border-slate-100">
            <span className="text-xs font-medium text-slate-500 block mb-1.5">
              Требуемые роли для доступа:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {allowedRoles.map((r) => (
                <span
                  key={r}
                  className="text-xs px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded-md font-medium"
                >
                  {getRoleLabel(r)}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="secondary"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              window.location.href = '/corporate/dashboard';
            }}
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            На главную дашборда
          </Button>
        </div>
      </div>
    </div>
  );
};

export const RequireRole: React.FC<RequireRoleProps> = ({
  allowedRoles,
  children,
  fallback,
}) => {
  const { activeMember, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated || !activeMember) {
    return <Navigate to="/login" replace />;
  }

  // Super admin and Org Admin always have access
  if (activeMember.role === 'platform_super_admin' || activeMember.role === 'org_admin') {
    return <>{children}</>;
  }

  const isAllowed = allowedRoles.includes(activeMember.role);

  if (!isAllowed) {
    if (fallback) return <>{fallback}</>;
    return <AccessDenied currentRole={activeMember.role} allowedRoles={allowedRoles} />;
  }

  return <>{children}</>;
};
