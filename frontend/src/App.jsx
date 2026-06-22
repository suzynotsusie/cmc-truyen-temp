import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LegacyRedirect from './components/LegacyRedirect';
import ChristmasSnow from './components/ChristmasSnow';

import ProtectedRoute from './components/ProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';

import AdminLayout from './layouts/AdminLayout';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminStoriesPage from './pages/AdminStoriesPage';

import HomePage from './pages/HomePage';
import FindStoriesPage from './pages/FindStoriesPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StoryDetailPage from './pages/StoryDetailPage';
import ChapterReaderPage from './pages/ChapterReaderPage';
import UserProfilePage from './pages/UserProfilePage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import AccountPage from './pages/AccountPage';
import NotFoundPage from './pages/NotFoundPage';

import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

function Layout() {
  return (
    <>
      <Navbar />
      <Outlet />
      <Footer />
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <ChristmasSnow />
          <LegacyRedirect />

          <Routes>

            {/* USER LAYOUT */}
            <Route element={<Layout />}>

              <Route path="/" element={<HomePage />} />
              <Route path="/browse" element={<FindStoriesPage />} />
              <Route path="/tim-truyen" element={<FindStoriesPage />} />

              <Route path="/reader" element={<LegacyRedirect />} />
              <Route path="/pages/*" element={<LegacyRedirect />} />

              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/account" element={<AccountPage />} />

              <Route path="/story/:id" element={<StoryDetailPage />} />
              <Route
                path="/story/:storyId/chapter/:chapterId"
                element={<ChapterReaderPage />}
              />

              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <UserProfilePage />
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
            </Route>
            <Route
              element={
                <RoleProtectedRoute allowedRoles={['Admin']}>
                  <AdminLayout />
                </RoleProtectedRoute>
              }
            >
              <Route path="/admin" element={<AdminPage />} />
            </Route>

            <Route path="/home" element={<Navigate to="/" replace />} />

          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
