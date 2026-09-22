import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import useAuthStore from './store/authStore';
import { useEffect, Suspense } from 'react';
import LoadingSpinner from './components/ui/LoadingSpinner';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import FavoritesPage from './pages/FavoritesPage';
import RentalRequestsPage from './pages/RentalRequestsPage';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
const ListingPage = React.lazy(() => import('./pages/ListingPage'));
const CreateListingPage = React.lazy(() => import('./pages/CreateListingPage'));
const MessagesPage = React.lazy(() => import('./pages/MessagesPage'));
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage'));
const AdminPage = React.lazy(() => import('./pages/AdminPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const RevenloDashboard = React.lazy(() => import('./pages/RevenloDashboard'));

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { isAuthenticated, user, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
    </Routes>
  );
}
