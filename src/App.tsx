import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import HomePage from '@/pages/HomePage';
import RecordsPage from '@/pages/RecordsPage';
import SettingsPage from '@/pages/SettingsPage';
import ReportsPage from '@/pages/ReportsPage';
import { AppProvider } from '@/lib/context/AppContext';
import { NotificationProvider } from '@/lib/context/NotificationContext';

const router = createBrowserRouter([
  {
    path: '/',
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
]);

function App() {
  return (
    <AppProvider>
      <NotificationProvider>
        <RouterProvider router={router} />
      </NotificationProvider>
    </AppProvider>
  );
}

export default App;
