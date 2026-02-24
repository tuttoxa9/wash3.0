import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import HomePage from '@/pages/HomePage';
import RecordsPage from '@/pages/RecordsPage';
import SettingsPage from '@/pages/SettingsPage';
import ReportsPage from '@/pages/ReportsPage';
import LoginPage from '@/pages/LoginPage';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AppProvider } from '@/lib/context/AppContext';
import { NotificationProvider } from '@/lib/context/NotificationContext';
import { AuthProvider } from '@/lib/context/AuthContext';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
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
