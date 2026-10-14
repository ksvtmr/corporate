import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, RequireRole } from '@iclever/frontend-kit';

import { AppLayout } from './components/layout/AppLayout';

// Optimized Lazy-loaded Route Chunks (Code-Splitting)
const LoginPage = React.lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const EmployeesPage = React.lazy(() => import('./pages/EmployeesPage').then((m) => ({ default: m.EmployeesPage })));
const DepartmentsPage = React.lazy(() => import('./pages/DepartmentsPage').then((m) => ({ default: m.DepartmentsPage })));
const MaterialsPage = React.lazy(() => import('./pages/MaterialsPage').then((m) => ({ default: m.MaterialsPage })));
const TracksPage = React.lazy(() => import('./pages/TracksPage').then((m) => ({ default: m.TracksPage })));
const CohortsPage = React.lazy(() => import('./pages/CohortsPage').then((m) => ({ default: m.CohortsPage })));
const AssignmentsPage = React.lazy(() => import('./pages/AssignmentsPage').then((m) => ({ default: m.AssignmentsPage })));
const AssessmentsPage = React.lazy(() => import('./pages/AssessmentsPage').then((m) => ({ default: m.AssessmentsPage })));
const ReviewsPage = React.lazy(() => import('./pages/ReviewsPage').then((m) => ({ default: m.ReviewsPage })));
const IntegrityPage = React.lazy(() => import('./pages/IntegrityPage').then((m) => ({ default: m.IntegrityPage })));
const PlayerPage = React.lazy(() => import('./pages/PlayerPage').then((m) => ({ default: m.PlayerPage })));
const FlashcardsPage = React.lazy(() => import('./pages/FlashcardsPage').then((m) => ({ default: m.FlashcardsPage })));
const AiChatPage = React.lazy(() => import('./pages/AiChatPage').then((m) => ({ default: m.AiChatPage })));
const AnalyticsPage = React.lazy(() => import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));
const ReportsPage = React.lazy(() => import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));

const PageLoader: React.FC = () => (
  <div className="min-h-[60vh] flex items-center justify-center bg-transparent">
    <div className="flex flex-col items-center space-y-3">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
      <span className="text-xs text-slate-400 font-medium tracking-wide">Загрузка модуля...</span>
    </div>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route
              path="/corporate"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/corporate/dashboard" replace />} />
              
              {/* Universal routes for all authenticated roles (including employee) */}
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="my/player" element={<PlayerPage />} />
              <Route path="flashcards" element={<FlashcardsPage />} />
              <Route path="ai-chat" element={<AiChatPage />} />

              {/* Admin, HR, and Manager routes */}
              <Route
                path="employees"
                element={
                  <RequireRole allowedRoles={['org_admin', 'platform_super_admin', 'hr_manager', 'manager']}>
                    <EmployeesPage />
                  </RequireRole>
                }
              />
              <Route
                path="assignments"
                element={
                  <RequireRole allowedRoles={['org_admin', 'platform_super_admin', 'hr_manager', 'manager']}>
                    <AssignmentsPage />
                  </RequireRole>
                }
              />
              <Route
                path="analytics"
                element={
                  <RequireRole allowedRoles={['org_admin', 'platform_super_admin', 'hr_manager', 'manager']}>
                    <AnalyticsPage />
                  </RequireRole>
                }
              />

              {/* Admin, HR, and Trainer routes */}
              <Route
                path="materials"
                element={
                  <RequireRole allowedRoles={['org_admin', 'platform_super_admin', 'hr_manager', 'trainer']}>
                    <MaterialsPage />
                  </RequireRole>
                }
              />
              <Route
                path="tracks"
                element={
                  <RequireRole allowedRoles={['org_admin', 'platform_super_admin', 'hr_manager', 'trainer']}>
                    <TracksPage />
                  </RequireRole>
                }
              />
              <Route
                path="assessments"
                element={
                  <RequireRole allowedRoles={['org_admin', 'platform_super_admin', 'hr_manager', 'trainer']}>
                    <AssessmentsPage />
                  </RequireRole>
                }
              />

              {/* Admin and HR-only restricted routes */}
              <Route
                path="departments"
                element={
                  <RequireRole allowedRoles={['org_admin', 'platform_super_admin', 'hr_manager']}>
                    <DepartmentsPage />
                  </RequireRole>
                }
              />
              <Route
                path="cohorts"
                element={
                  <RequireRole allowedRoles={['org_admin', 'platform_super_admin', 'hr_manager']}>
                    <CohortsPage />
                  </RequireRole>
                }
              />
              <Route
                path="reviews"
                element={
                  <RequireRole allowedRoles={['org_admin', 'platform_super_admin', 'hr_manager']}>
                    <ReviewsPage />
                  </RequireRole>
                }
              />
              <Route
                path="integrity"
                element={
                  <RequireRole allowedRoles={['org_admin', 'platform_super_admin', 'hr_manager']}>
                    <IntegrityPage />
                  </RequireRole>
                }
              />
              <Route
                path="reports"
                element={
                  <RequireRole allowedRoles={['org_admin', 'platform_super_admin', 'hr_manager']}>
                    <ReportsPage />
                  </RequireRole>
                }
              />
              <Route
                path="settings"
                element={
                  <RequireRole allowedRoles={['org_admin', 'platform_super_admin', 'hr_manager']}>
                    <SettingsPage />
                  </RequireRole>
                }
              />
            </Route>

            <Route path="*" element={<Navigate to="/corporate/dashboard" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
