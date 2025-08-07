import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import HomePage from '@/pages/HomePage';
import RecordsPage from '@/pages/RecordsPage';
import SettingsPage from '@/pages/SettingsPage';
import ReportsPage from '@/pages/ReportsPage';
import LoginPage from '@/pages/LoginPage';
import { AppProvider } from '@/lib/context/AppContext';
import { NotificationProvider } from '@/lib/context/NotificationContext';
import { AuthProvider, useAuth } from '@/lib/context/AuthContext';

// Компонент для защищенных маршрутов
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Загрузка...</div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/',
    element: <ProtectedRoute><Layout /></ProtectedRoute>,
    children: [
      {
        index: true,
        element: <HomePage />
      },
      {
        path: 'records',
        element: <RecordsPage />
      },
      {
        path: 'reports',
        element: <ReportsPage />
      },
      {
        path: 'settings',
        element: <SettingsPage />
      }
    ]
  }
]);

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <NotificationProvider>
          <RouterProvider router={router} />
        </NotificationProvider>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
