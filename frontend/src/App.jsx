import { createBrowserRouter, createRoutesFromElements, RouterProvider, Navigate, Outlet, Route } from 'react-router-dom';
import { ScrollRestoration } from 'react-router-dom';
import ModeratorLayout from './layouts/ModeratorLayout';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LegacyRedirect from './components/LegacyRedirect';

import ProtectedRoute from './components/ProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';

import AdminLayout from './layouts/AdminLayout';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminStoriesPage from './pages/AdminStoriesPage';
import AdminReportsPage from './pages/AdminReportsPage';
import ManageBadWords from './pages/admin/ManageBadWords';

import ModeratorDashboardPage from './pages/moderator/ModeratorDashboardPage';
import ModeratorPendingStoriesPage from './pages/moderator/ModeratorPendingStoriesPage';
import ModeratorCommentsPage from './pages/moderator/ModeratorCommentsPage';
import ModeratorProfilesPage from './pages/moderator/ModeratorProfilesPage';
import AuditLogsPage from './pages/AuditLogsPage';

import HomePage from './pages/HomePage';
import FindStoriesPage from './pages/FindStoriesPage';
import RankingsPage from './pages/RankingsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import GoogleRegisterCompletePage from './pages/GoogleRegisterCompletePage';
import StoryDetailPage from './pages/StoryDetailPage';
import ChapterReaderPage from './pages/ChapterReaderPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import AccountSettingsPage from './pages/AccountSettingsPage';
import FollowingStoriesPage from './pages/FollowingStoriesPage';
import ReadingHistoryPage from './pages/ReadingHistoryPage';
import UploaderRevenuePage from './pages/UploaderRevenuePage';
import AdminPayoutsPage from './pages/AdminPayoutsPage';
import NotFoundPage from './pages/NotFoundPage';

import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faExclamationCircle, faTimes } from '@fortawesome/free-solid-svg-icons';

function PayOSCallbackHandler() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const cancel = searchParams.get('cancel');
    
    if (code || cancel) {
      if (cancel === 'true') {
        setNotification({ type: 'warning', message: 'Bạn đã huỷ giao dịch nạp Tinh thạch.' });
      } else if (code === '00') {
        setNotification({ type: 'success', message: 'Thanh toán thành công! Tinh thạch sẽ sớm được cộng vào tài khoản.' });
      } else {
        setNotification({ type: 'warning', message: 'Giao dịch thanh toán thất bại hoặc có lỗi xảy ra.' });
      }
      
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('code');
      newParams.delete('id');
      newParams.delete('cancel');
      newParams.delete('status');
      newParams.delete('orderCode');
      setSearchParams(newParams, { replace: true });
      
      setTimeout(() => setNotification(null), 7000);
    }
  }, [searchParams, setSearchParams]);

  if (!notification) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      right: '20px',
      zIndex: 9999,
      backgroundColor: notification.type === 'success' ? '#d1e7dd' : '#fff3cd',
      color: notification.type === 'success' ? '#0f5132' : '#856404',
      padding: '16px 20px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      transition: 'opacity 0.3s ease-in-out'
    }}>
      <FontAwesomeIcon icon={notification.type === 'success' ? faCheckCircle : faExclamationCircle} size="lg" />
      <span style={{ fontWeight: 500 }}>{notification.message}</span>
      <button 
        onClick={() => setNotification(null)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: '10px', color: 'inherit', fontSize: '1.2rem' }}
      >
        <FontAwesomeIcon icon={faTimes} />
      </button>
    </div>
  );
}

function Layout() {
  return (
    <>
      <Navbar />
      <Outlet />
      <Footer />
    </>
  );
}

function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ScrollRestoration />
        <PayOSCallbackHandler />
        <LegacyRedirect />
        <Outlet />
      </AuthProvider>
    </ThemeProvider>
  );
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<RootLayout />}>
      {/* USER LAYOUT */}
      <Route element={<Layout />}>

              <Route path="/" element={<HomePage />} />
              <Route path="/browse" element={<FindStoriesPage />} />
              <Route path="/tim-truyen" element={<FindStoriesPage />} />
              <Route path="/bang-xep-hang" element={<RankingsPage />} />

              <Route path="/reader" element={<LegacyRedirect />} />
              <Route path="/pages/*" element={<LegacyRedirect />} />

              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/auth/google/complete" element={<GoogleRegisterCompletePage />} />
              <Route path="/account" element={<Navigate to="/account/following" replace />} />

              <Route
                path="/account/following"
                element={
                  <ProtectedRoute>
                    <FollowingStoriesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/account/history"
                element={
                  <ProtectedRoute>
                    <ReadingHistoryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/account/settings"
                element={
                  <ProtectedRoute>
                    <AccountSettingsPage />
                  </ProtectedRoute>
                }
              />

              <Route path="/story/:slug" element={<StoryDetailPage />} />
              <Route
                path="/:storySlug/:chapterNumber"
                element={<ChapterReaderPage />}
              />

              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Navigate to="/account/settings" replace />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard"
                element={
                  <RoleProtectedRoute allowedRoles={['Uploader', 'Admin']}>
                    <DashboardPage />
                  </RoleProtectedRoute>
                }
              />

              <Route
                path="/uploader/revenue"
                element={
                  <RoleProtectedRoute allowedRoles={['Uploader', 'Admin']}>
                    <UploaderRevenuePage />
                  </RoleProtectedRoute>
                }
              />

              <Route path="*" element={<NotFoundPage />} />
            </Route>

            {/* ADMIN LAYOUT RIÊNG */}
            <Route
              element={
                <RoleProtectedRoute allowedRoles={['Admin']}>
                  <AdminLayout />
                </RoleProtectedRoute>
              }
            >
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/stories" element={<AdminStoriesPage />} />
              <Route path="/admin/reports" element={<AdminReportsPage />} />
              <Route path="/admin/payouts" element={<AdminPayoutsPage />} />
              <Route path="/admin/bad-words" element={<ManageBadWords />} />
              <Route path="/admin/comments" element={<ModeratorCommentsPage />} />
              <Route path="/admin/profiles" element={<ModeratorProfilesPage />} />
              <Route path="/admin/logs" element={<AuditLogsPage />} />
            </Route>

            {/* MODERATOR LAYOUT RIÊNG */}
            <Route
              element={
                <RoleProtectedRoute allowedRoles={['Moderator', 'Admin']}>
                  <ModeratorLayout />
                </RoleProtectedRoute>
              }
            >
              <Route path="/moderator/dashboard" element={<ModeratorDashboardPage />} />
              <Route path="/moderator/pending-stories" element={<ModeratorPendingStoriesPage />} />
              <Route path="/moderator/reports" element={<AdminReportsPage />} />
              <Route path="/moderator/comments" element={<ModeratorCommentsPage />} />
              <Route path="/moderator/profiles" element={<ModeratorProfilesPage />} />
              <Route path="/moderator/logs" element={<AuditLogsPage />} />
            </Route>

          <Route path="/home" element={<Navigate to="/" replace />} />

    </Route>
  )
);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
