import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';

// Layouts
import AppLayout from './components/layout/AppLayout';
import AuthLayout from './components/layout/AuthLayout';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import AuthCallback from './pages/auth/AuthCallback';

// App Pages
import DashboardPage from './pages/DashboardPage';
import ChatPage from './pages/ChatPage';
import TasksPage from './pages/TasksPage';
import NotesPage from './pages/NotesPage';
import GoalsPage from './pages/GoalsPage';
import RemindersPage from './pages/RemindersPage';
import KnowledgeBasePage from './pages/KnowledgeBasePage';
import LearningPage from './pages/LearningPage';
import ResumePage from './pages/ResumePage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import LandingPage from './pages/LandingPage';

// Components
import LoadingScreen from './components/ui/LoadingScreen';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <LoadingScreen />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

import NetworkBackground from './components/ui/NetworkBackground';

export default function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <NetworkBackground />
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none select-none whitespace-nowrap">
        <p className="text-[10px] md:text-xs font-medium text-surface-200/30 tracking-wider">
          © {new Date().getFullYear()} Jinnapu S S S Durga Pavan Kumar. All Rights Reserved.
        </p>
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#18181b',
            color: '#fafafa',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Protected App Routes */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/reminders" element={<RemindersPage />} />
          <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
          <Route path="/learning" element={<LearningPage />} />
          <Route path="/resume" element={<ResumePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
