import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  BookOpen,
  GraduationCap,
  UserCheck,
  ClipboardList,
  CheckSquare,
  FileCheck,
  ShieldAlert,
  Play,
  RotateCw,
  MessageSquare,
  BarChart3,
  FileSpreadsheet,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import {
  can,
  Capability,
  DEMO_ACCOUNTS,
  IS_DEMO_MODE,
  LanguageSwitcher,
  Role,
  useApiErrorMessage,
  useAuth,
  useI18n,
  useToast,
} from '@iclever/frontend-kit';

interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  capability: Capability;
}

function navFor(role: Role): NavItem[] {
  if (role === 'employee') {
    return [
      { to: '/corporate/dashboard', labelKey: 'layout.nav.myDashboard', icon: LayoutDashboard, capability: 'learning.self' },
      { to: '/corporate/my/player', labelKey: 'layout.nav.player', icon: Play, capability: 'learning.self' },
      { to: '/corporate/my/player?view=test', labelKey: 'layout.nav.myTests', icon: CheckSquare, capability: 'learning.self' },
      { to: '/corporate/flashcards', labelKey: 'layout.nav.flashcards', icon: RotateCw, capability: 'learning.self' },
      { to: '/corporate/ai-chat', labelKey: 'layout.nav.aiChat', icon: MessageSquare, capability: 'ai.assistant' },
    ];
  }
  if (role === 'manager') {
    return [
      { to: '/corporate/dashboard', labelKey: 'layout.nav.teamDashboard', icon: LayoutDashboard, capability: 'analytics.read' },
      { to: '/corporate/employees', labelKey: 'layout.nav.myTeam', icon: Users, capability: 'members.read' },
      { to: '/corporate/assignments', labelKey: 'layout.nav.teamAssignments', icon: ClipboardList, capability: 'assignments.manage' },
      { to: '/corporate/analytics', labelKey: 'layout.nav.teamAnalytics', icon: BarChart3, capability: 'analytics.read' },
      { to: '/corporate/ai-chat', labelKey: 'layout.nav.knowledgeAi', icon: MessageSquare, capability: 'ai.assistant' },
    ];
  }
  if (role === 'trainer') {
    return [
      { to: '/corporate/dashboard', labelKey: 'layout.nav.trainerDashboard', icon: LayoutDashboard, capability: 'materials.manage' },
      { to: '/corporate/materials', labelKey: 'layout.nav.knowledgeBase', icon: BookOpen, capability: 'materials.manage' },
      { to: '/corporate/tracks', labelKey: 'layout.nav.tracks', icon: GraduationCap, capability: 'tracks.manage' },
      { to: '/corporate/assessments', labelKey: 'layout.nav.assessments', icon: CheckSquare, capability: 'assessments.manage' },
      { to: '/corporate/flashcards', labelKey: 'layout.nav.flashcards', icon: RotateCw, capability: 'learning.self' },
    ];
  }
  return [
    { to: '/corporate/dashboard', labelKey: 'layout.nav.dashboard', icon: LayoutDashboard, capability: 'analytics.read' },
    { to: '/corporate/employees', labelKey: 'layout.nav.employees', icon: Users, capability: 'members.read' },
    { to: '/corporate/departments', labelKey: 'layout.nav.departments', icon: Building2, capability: 'org.structure' },
    { to: '/corporate/materials', labelKey: 'layout.nav.materials', icon: BookOpen, capability: 'materials.manage' },
    { to: '/corporate/tracks', labelKey: 'layout.nav.tracks', icon: GraduationCap, capability: 'tracks.manage' },
    { to: '/corporate/cohorts', labelKey: 'layout.nav.cohorts', icon: UserCheck, capability: 'cohorts.manage' },
    { to: '/corporate/assignments', labelKey: 'layout.nav.assignments', icon: ClipboardList, capability: 'assignments.manage' },
    { to: '/corporate/assessments', labelKey: 'layout.nav.assessmentsBank', icon: CheckSquare, capability: 'assessments.manage' },
    { to: '/corporate/reviews', labelKey: 'layout.nav.reviews', icon: FileCheck, capability: 'reviews.manage' },
    { to: '/corporate/integrity', labelKey: 'layout.nav.integrity', icon: ShieldAlert, capability: 'integrity.manage' },
    { to: '/corporate/analytics', labelKey: 'layout.nav.analytics', icon: BarChart3, capability: 'analytics.read' },
    { to: '/corporate/reports', labelKey: 'layout.nav.reports', icon: FileSpreadsheet, capability: 'reports.export' },
    { to: '/corporate/settings', labelKey: 'layout.nav.settings', icon: Settings, capability: 'org.settings' },
  ];
}

const DEMO_ROLE_ICONS: Record<string, string> = { org_admin: '🛡️', hr_manager: '📋', manager: '👔', trainer: '🎓', employee: '👤' };

export const AppLayout: React.FC = () => {
  const { user, activeMember, memberships, switchOrganization, logout, switchDemoRole, changeLocale } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const errorMessage = useApiErrorMessage();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [switchingRole, setSwitchingRole] = useState<Role | null>(null);
  const orgMenuRef = useRef<HTMLDivElement>(null);

  const role: Role = activeMember?.role ?? 'employee';
  const navItems = navFor(role).filter((item) => can(role, item.capability));
  const activeOrgs = memberships.filter((m) => m.status === 'active');

  // Close menus on navigation, outside click and Escape.
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsOrgDropdownOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!isOrgDropdownOpen) return;
    const onClick = (e: MouseEvent) => {
      if (orgMenuRef.current && !orgMenuRef.current.contains(e.target as Node)) setIsOrgDropdownOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsOrgDropdownOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOrgDropdownOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleDemoRole = async (target: Role) => {
    if (target === role || switchingRole) return;
    setSwitchingRole(target);
    const res = await switchDemoRole(target);
    setSwitchingRole(null);
    if (res.ok) navigate('/corporate/dashboard');
    else toast.error(errorMessage(res.error));
  };

  const handleSwitchOrg = async (orgId: string) => {
    setIsOrgDropdownOpen(false);
    if (orgId === activeMember?.organization_id) return;
    const res = await switchOrganization(orgId);
    if (res.ok) navigate('/corporate/dashboard');
    else toast.error(errorMessage(res.error));
  };

  const isItemActive = (to: string) => {
    const [path, query] = to.split('?');
    if (location.pathname !== path) return false;
    return query ? location.search === `?${query}` : !location.search.includes('view=');
  };

  const navLinkClass = (to: string) =>
    `flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
      isItemActive(to) ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
    }`;

  const userInitials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase() || '•';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-3 focus:py-2 focus:bg-white focus:rounded-lg focus:shadow">
        {t('layout.skipToContent')}
      </a>

      {/* Global top bar: language (always) + demo role switcher (mock mode only) */}
      <div className="bg-slate-900 text-slate-200 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs z-40 md:sticky md:top-0 shadow-sm min-h-10">
        {IS_DEMO_MODE ? (
          <div className="flex items-center gap-2 min-w-0 overflow-x-auto">
            <span className="font-bold text-indigo-400 flex items-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> {t('layout.demoSwitcher.label')}
            </span>
            <div role="group" aria-label={t('layout.demoSwitcher.label')} className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  disabled={!!switchingRole}
                  aria-pressed={role === acc.role}
                  title={t('layout.demoSwitcher.signInAs', { name: acc.name, email: acc.email })}
                  onClick={() => handleDemoRole(acc.role)}
                  className={`px-2.5 py-1 rounded-md transition-all font-medium whitespace-nowrap disabled:opacity-60 ${
                    role === acc.role ? 'bg-indigo-600 text-white font-semibold shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span aria-hidden="true">{DEMO_ROLE_ICONS[acc.role]} </span>
                  {switchingRole === acc.role ? t('common.states.loading') : t(`roles.short.${acc.role}`)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <span className="font-semibold text-slate-300">iClever Corporate</span>
        )}
        <LanguageSwitcher tone="dark" onChange={(loc) => void changeLocale(loc)} />
      </div>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 fixed top-10 bottom-0 z-30" aria-label={t('layout.sidebar')}>
          <div className="h-16 flex items-center px-6 border-b border-slate-200">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow" aria-hidden="true">
                iC
              </div>
              <div>
                <span className="font-bold text-slate-900 leading-none block">iClever</span>
                <span className="text-xs text-indigo-600 font-semibold tracking-wide uppercase">Corporate</span>
              </div>
            </div>
          </div>

          <div className="p-4 border-b border-slate-100 relative" ref={orgMenuRef}>
            <button
              type="button"
              onClick={() => setIsOrgDropdownOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={isOrgDropdownOpen}
              className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-900 truncate">{activeMember?.org_name}</p>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-indigo-600 truncate">{t(`roles.${role}`)}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-500 shrink-0 ml-2" aria-hidden="true" />
            </button>

            {isOrgDropdownOpen && (
              <div role="listbox" aria-label={t('layout.organizations')} className="absolute top-16 left-4 right-4 bg-white rounded-lg shadow-lg border border-slate-200 p-1 z-40">
                <p className="text-[10px] font-semibold text-slate-400 px-2 py-1 uppercase">{t('layout.organizations')}</p>
                {activeOrgs.map((m) => (
                  <button
                    key={m.organization_id}
                    type="button"
                    role="option"
                    aria-selected={m.organization_id === activeMember?.organization_id}
                    onClick={() => handleSwitchOrg(m.organization_id)}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs truncate ${
                      m.organization_id === activeMember?.organization_id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {m.org_name || m.org_slug}
                    <span className="block text-[10px] text-slate-400">{t(`roles.${m.role}`)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1" aria-label={t('layout.mainNav')}>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.to} to={item.to} className={() => navLinkClass(item.to)} aria-current={isItemActive(item.to) ? 'page' : undefined}>
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{t(item.labelKey)}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0" aria-hidden="true">
                {userInitials}
              </span>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title={t('layout.logout')}
              aria-label={t('layout.logout')}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-red-600 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </aside>

        <div className="flex-1 md:pl-64 flex flex-col min-w-0">
          <header className="md:hidden h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-20">
            <div className="flex items-center space-x-2 min-w-0">
              <div className="w-7 h-7 rounded bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shrink-0" aria-hidden="true">
                iC
              </div>
              <span className="font-bold text-slate-900 text-sm truncate">{activeMember?.org_name || 'iClever Corporate'}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={isMobileMenuOpen ? t('layout.closeMenu') : t('layout.openMenu')}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
            </button>
          </header>

          {isMobileMenuOpen && (
            <div id="mobile-menu" className="md:hidden bg-white border-b border-slate-200 p-4 space-y-1">
              <nav aria-label={t('layout.mainNav')} className="space-y-1">
                {navItems.map((item) => (
                  <NavLink key={item.to} to={item.to} className={() => navLinkClass(item.to)}>
                    <item.icon className="w-4 h-4" aria-hidden="true" />
                    <span>{t(item.labelKey)}</span>
                  </NavLink>
                ))}
              </nav>
              {activeOrgs.length > 1 && (
                <div className="pt-3 mt-2 border-t border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-400 px-3 pb-1 uppercase">{t('layout.organizations')}</p>
                  {activeOrgs.map((m) => (
                    <button key={m.organization_id} type="button" onClick={() => handleSwitchOrg(m.organization_id)} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 rounded hover:bg-slate-50">
                      {m.org_name}
                    </button>
                  ))}
                </div>
              )}
              <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between px-3">
                <div className="truncate text-xs">
                  <p className="font-semibold text-slate-900 truncate">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-slate-500 truncate">{t(`roles.${role}`)}</p>
                </div>
                <button type="button" onClick={handleLogout} className="flex items-center gap-1 text-xs font-medium text-red-600 px-2 py-1 rounded hover:bg-red-50">
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  {t('layout.logout')}
                </button>
              </div>
            </div>
          )}

          <main id="main-content" tabIndex={-1} className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto focus:outline-none">
            {/* Remount pages when the tenant changes so no data from the previous organization survives. */}
            <Outlet key={activeMember?.organization_id} />
          </main>
        </div>
      </div>
    </div>
  );
};
