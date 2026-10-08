import React from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuthStore from './store/authStore';
import { useEffect, Suspense } from 'react';
import LoadingSpinner from './components/ui/LoadingSpinner';
import { recordPath } from './utils/navHistory';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import FavoritesPage from './pages/FavoritesPage';
import RentalRequestsPage from './pages/RentalRequestsPage';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import NotFoundPage from './pages/NotFoundPage';
import LegalPage from './pages/LegalPage';
const ListingPage = React.lazy(() => import('./pages/ListingPage'));
const CreateListingPage = React.lazy(() => import('./pages/CreateListingPage'));
const MessagesPage = React.lazy(() => import('./pages/MessagesPage'));
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage'));
const AdminPage = React.lazy(() => import('./pages/AdminPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const RevenloDashboard = React.lazy(() => import('./pages/RevenloDashboard'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { isAuthenticated, user, isInitialized } = useAuthStore();
  const location = useLocation();

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Deep links (the «Открыть чат» button in rental emails) land here while
    // signed out — remember where the user was headed so login can bring
    // them back to the exact page (with its query string).
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (adminOnly && user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>}>
      {children}
    </Suspense>
  );
}

function SiteLayout() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

function NavRecorder() {
  const location = useLocation();

  useEffect(() => {
    recordPath(location.pathname);
  }, [location.pathname]);

  return null;
}

export default function App() {
  const { initialize, isInitialized } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <>
      <NavRecorder />
      <Routes>
        {/* Revenlo admin dashboard — full-screen, outside site Layout */}
        <Route
          path="/revenlo/*"
          element={
            <ProtectedRoute adminOnly>
              <SuspenseWrapper><RevenloDashboard /></SuspenseWrapper>
            </ProtectedRoute>
          }
        />
        {/* Owner dashboard — full-screen, outside site Layout */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <SuspenseWrapper><DashboardPage /></SuspenseWrapper>
            </ProtectedRoute>
          }
        />
        <Route element={<SiteLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/listing/:id" element={<SuspenseWrapper><ListingPage /></SuspenseWrapper>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<LoginPage />} />
          <Route
            path="/create-listing"
            element={
              <ProtectedRoute>
                <SuspenseWrapper><CreateListingPage /></SuspenseWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="/favorites"
            element={
              <ProtectedRoute>
                <FavoritesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <SuspenseWrapper><MessagesPage /></SuspenseWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rental-requests"
            element={
              <ProtectedRoute>
                <RentalRequestsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <SuspenseWrapper><NotificationsPage /></SuspenseWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SuspenseWrapper><SettingsPage /></SuspenseWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <SuspenseWrapper><AdminPage /></SuspenseWrapper>
              </ProtectedRoute>
            }
          />
          <Route path="/terms" element={<LegalPage kind="terms" />} />
          <Route path="/privacy" element={<LegalPage kind="privacy" />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
}
