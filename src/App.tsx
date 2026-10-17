import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, Capability, I18nProvider, RequireCapability, ToastProvider, useAuth, useI18n } from '@iclever/frontend-kit';
import { AppLayout } from './components/layout/AppLayout';

const lazyPage = <K extends string>(loader: () => Promise<Record<K, React.ComponentType>>, name: K) =>
  React.lazy(() => loader().then((m) => ({ default: m[name] })));

const LoginPage = lazyPage(() => import('./pages/LoginPage'), 'LoginPage');
const RegisterPage = lazyPage(() => import('./pages/RegisterPage'), 'RegisterPage');
const AcceptInvitePage = lazyPage(() => import('./pages/AcceptInvitePage'), 'AcceptInvitePage');
const DashboardPage = lazyPage(() => import('./pages/DashboardPage'), 'DashboardPage');
const EmployeesPage = lazyPage(() => import('./pages/EmployeesPage'), 'EmployeesPage');
const DepartmentsPage = lazyPage(() => import('./pages/DepartmentsPage'), 'DepartmentsPage');
const MaterialsPage = lazyPage(() => import('./pages/MaterialsPage'), 'MaterialsPage');
const TracksPage = lazyPage(() => import('./pages/TracksPage'), 'TracksPage');
const CohortsPage = lazyPage(() => import('./pages/CohortsPage'), 'CohortsPage');
const AssignmentsPage = lazyPage(() => import('./pages/AssignmentsPage'), 'AssignmentsPage');
const AssessmentsPage = lazyPage(() => import('./pages/AssessmentsPage'), 'AssessmentsPage');
const ReviewsPage = lazyPage(() => import('./pages/ReviewsPage'), 'ReviewsPage');
const IntegrityPage = lazyPage(() => import('./pages/IntegrityPage'), 'IntegrityPage');
const PlayerPage = lazyPage(() => import('./pages/PlayerPage'), 'PlayerPage');
const FlashcardsPage = lazyPage(() => import('./pages/FlashcardsPage'), 'FlashcardsPage');
const AiChatPage = lazyPage(() => import('./pages/AiChatPage'), 'AiChatPage');
const AnalyticsPage = lazyPage(() => import('./pages/AnalyticsPage'), 'AnalyticsPage');
const ReportsPage = lazyPage(() => import('./pages/ReportsPage'), 'ReportsPage');
const SettingsPage = lazyPage(() => import('./pages/SettingsPage'), 'SettingsPage');

const PageLoader: React.FC = () => {
  const { t } = useI18n();
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-transparent" role="status" aria-busy="true">
      <div className="flex flex-col items-center space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
        <span className="text-xs text-slate-400 font-medium tracking-wide">{t('common.states.loadingModule')}</span>
      </div>
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50" role="status" aria-busy="true">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <>{children}</>;
};

/** Login/registration are pointless for signed-in users: send them to the dashboard. */
const GuestRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/corporate/dashboard" replace />;
  return <>{children}</>;
};

const guarded = (capability: Capability, element: React.ReactNode) => <RequireCapability capability={capability}>{element}</RequireCapability>;

export const App: React.FC = () => (
  <I18nProvider>
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
              <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
              <Route path="/invite" element={<AcceptInvitePage />} />

              <Route path="/corporate" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/corporate/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="my/player" element={guarded('learning.self', <PlayerPage />)} />
                <Route path="flashcards" element={guarded('learning.self', <FlashcardsPage />)} />
                <Route path="ai-chat" element={guarded('ai.assistant', <AiChatPage />)} />
                <Route path="employees" element={guarded('members.read', <EmployeesPage />)} />
                <Route path="assignments" element={guarded('assignments.manage', <AssignmentsPage />)} />
                <Route path="analytics" element={guarded('analytics.read', <AnalyticsPage />)} />
                <Route path="materials" element={guarded('materials.manage', <MaterialsPage />)} />
                <Route path="tracks" element={guarded('tracks.manage', <TracksPage />)} />
                <Route path="assessments" element={guarded('assessments.manage', <AssessmentsPage />)} />
                <Route path="departments" element={guarded('org.structure', <DepartmentsPage />)} />
                <Route path="cohorts" element={guarded('cohorts.manage', <CohortsPage />)} />
                <Route path="reviews" element={guarded('reviews.manage', <ReviewsPage />)} />
                <Route path="integrity" element={guarded('integrity.manage', <IntegrityPage />)} />
                <Route path="reports" element={guarded('reports.export', <ReportsPage />)} />
                <Route path="settings" element={guarded('org.settings', <SettingsPage />)} />
                <Route path="*" element={<Navigate to="/corporate/dashboard" replace />} />
              </Route>

              <Route path="*" element={<Navigate to="/corporate/dashboard" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  </I18nProvider>
);

export default App;
