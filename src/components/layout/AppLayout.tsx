import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
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
  Globe,
  Sparkles,
  Shield
} from 'lucide-react';

import { useAuth } from '@iclever/frontend-kit';

export const AppLayout: React.FC = () => {
  const { user, activeMember, memberships, switchOrganization, logout, switchRole, locale, setLocale } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const role = activeMember?.role || 'org_admin';

  // Role-aware Navigation list
  const getNavItems = () => {
    if (role === 'employee') {
      return [
        { to: '/corporate/dashboard', label: 'Мой дашборд', icon: LayoutDashboard },
        { to: '/corporate/my/player', label: 'Плеер курса', icon: Play },
        { to: '/corporate/my/player?view=test', label: 'Тесты и аттестации', icon: CheckSquare },
        { to: '/corporate/flashcards', label: 'Карточки Flashcards', icon: RotateCw },
        { to: '/corporate/ai-chat', label: 'Корпоративный AI-чат', icon: MessageSquare },
      ];
    }

    if (role === 'manager') {
      return [
        { to: '/corporate/dashboard', label: 'Дашборд команды', icon: LayoutDashboard },
        { to: '/corporate/employees', label: 'Команда инженеров', icon: Users },
        { to: '/corporate/assignments', label: 'Успеваемость и дедлайны', icon: ClipboardList },
        { to: '/corporate/analytics', label: 'Аналитика команды', icon: BarChart3 },
        { to: '/corporate/ai-chat', label: 'База знаний & AI', icon: MessageSquare },
      ];
    }

    if (role === 'trainer') {
      return [
        { to: '/corporate/dashboard', label: 'Дашборд методиста', icon: LayoutDashboard },
        { to: '/corporate/materials', label: 'База знаний', icon: BookOpen },
        { to: '/corporate/tracks', label: 'Учебные треки', icon: GraduationCap },
        { to: '/corporate/assessments', label: 'Банк вопросов и тесты', icon: CheckSquare },
        { to: '/corporate/flashcards', label: 'Карточки (Flashcards)', icon: RotateCw },
      ];
    }

    // Default: Org Admin & HR Manager (Full Access)
    return [
      { to: '/corporate/dashboard', label: 'Дашборд', icon: LayoutDashboard },
      { to: '/corporate/employees', label: 'Сотрудники', icon: Users },
      { to: '/corporate/departments', label: 'Оргструктура', icon: Building2 },
      { to: '/corporate/materials', label: 'Материалы', icon: BookOpen },
      { to: '/corporate/tracks', label: 'Треки обучения', icon: GraduationCap },
      { to: '/corporate/cohorts', label: 'Когорты', icon: UserCheck },
      { to: '/corporate/assignments', label: 'Назначения', icon: ClipboardList },
      { to: '/corporate/assessments', label: 'Тесты и банк', icon: CheckSquare },
      { to: '/corporate/reviews', label: 'Проверка ответов (AI)', icon: FileCheck },
      { to: '/corporate/integrity', label: 'События честности', icon: ShieldAlert },
      { to: '/corporate/analytics', label: 'HR-аналитика', icon: BarChart3 },
      { to: '/corporate/reports', label: 'Экспорт отчетов', icon: FileSpreadsheet },
      { to: '/corporate/settings', label: 'Настройки', icon: Settings },
    ];
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* TOP DEV ROLE SWITCHER & GLOBAL CONTROLS BAR */}
      <div className="bg-slate-900 text-slate-200 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between text-xs z-40 sticky top-0 shadow-sm">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-indigo-400 flex items-center">
            <Sparkles className="w-3.5 h-3.5 mr-1" /> Dev Role Switcher:
          </span>
          <div className="flex items-center space-x-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700">
            <button
              onClick={() => switchRole('org_admin')}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                role === 'org_admin' ? 'bg-indigo-600 text-white font-semibold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🛡️ Org Admin
            </button>
            <button
              onClick={() => switchRole('hr_manager')}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                role === 'hr_manager' ? 'bg-indigo-600 text-white font-semibold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📋 HR Manager
            </button>
            <button
              onClick={() => switchRole('manager')}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                role === 'manager' ? 'bg-indigo-600 text-white font-semibold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              👔 Manager (Виктор Ким)
            </button>
            <button
              onClick={() => switchRole('trainer')}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                role === 'trainer' ? 'bg-indigo-600 text-white font-semibold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🎓 Trainer
            </button>
            <button
              onClick={() => switchRole('employee')}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                role === 'employee' ? 'bg-indigo-600 text-white font-semibold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              👤 Employee (Марат)
            </button>
          </div>
        </div>

        {/* Language selector */}
        <div className="flex items-center space-x-3 mt-1 sm:mt-0">
          <div className="flex items-center space-x-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            {(['ru', 'kk', 'en'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLocale(lang)}
                className={`px-1.5 py-0.5 rounded uppercase font-bold text-[10px] ${
                  locale === lang ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1">
        {/* Sidebar Desktop */}
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 fixed top-10 bottom-0 z-30">
          <div className="h-16 flex items-center px-6 border-b border-slate-200">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow">
                iC
              </div>
              <div>
                <span className="font-bold text-slate-900 leading-none block">iClever</span>
                <span className="text-xs text-indigo-600 font-semibold tracking-wide uppercase">Corporate</span>
              </div>
            </div>
          </div>

          {/* Tenant Selector */}
          <div className="p-4 border-b border-slate-100 relative">
            <button
              onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
              className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition"
            >
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {activeMember?.org_name || 'Fintech Innovations Corp'}
                </p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold text-indigo-600">
                  {role}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-500 shrink-0 ml-2" />
            </button>

            {isOrgDropdownOpen && (
              <div className="absolute top-16 left-4 right-4 bg-white rounded-lg shadow-lg border border-slate-200 p-1 z-40">
                <p className="text-[10px] font-semibold text-slate-400 px-2 py-1 uppercase">Компании</p>
                {memberships.map((m) => (
                  <button
                    key={m.organization_id}
                    onClick={() => {
                      switchOrganization(m.organization_id);
                      setIsOrgDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs truncate ${
                      m.organization_id === activeMember?.organization_id
                        ? 'bg-indigo-50 text-indigo-700 font-medium'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {m.org_name || m.org_slug}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Navigation items */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* User bottom profile */}
          <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="truncate pr-2">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              title="Выйти"
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-red-600 transition"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </aside>

        {/* Main Container */}
        <div className="flex-1 md:pl-64 flex flex-col min-w-0">
          {/* Top Header Mobile */}
          <header className="md:hidden h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-10 z-20">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded bg-indigo-600 text-white font-bold flex items-center justify-center text-sm">
                iC
              </div>
              <span className="font-bold text-slate-900 text-sm">iClever Corporate</span>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </header>

          {/* Mobile menu dropdown */}
          {isMobileMenuOpen && (
            <div className="md:hidden bg-white border-b border-slate-200 p-4 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          )}

          {/* Main Content Area */}
          <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
