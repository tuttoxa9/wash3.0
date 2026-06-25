import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/layout/Layout";
import { AuthProvider } from "@/lib/context/AuthContext";
import { NotificationProvider } from "@/lib/context/NotificationContext";
import DesktopPage from "@/pages/DesktopPage";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import RecordsPage from "@/pages/RecordsPage";
import ReportsPage from "@/pages/ReportsPage";
import SettingsPage from "@/pages/SettingsPage";
import PayoutsPage from "@/pages/PayoutsPage";
import ServicesPage from "@/pages/ServicesPage";
import CrmPage from "@/pages/CrmPage";
import { RouterProvider, createBrowserRouter } from "react-router-dom";

const router = createBrowserRouter([
  {
    path: "/",
    element: <DesktopPage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/crm",
    element: <ProtectedRoute />,
    children: [
      {
        index: true,
        element: <CrmPage />,
      },
    ],
  },
  {
    path: "/wash",
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          {
            index: true,
            element: <HomePage />,
          },
          {
            path: "records",
            element: <RecordsPage />,
          },
          {
            path: "reports",
            element: <ReportsPage />,
          },
          {
            path: "payouts",
            element: <PayoutsPage />,
          },
          {
            path: "services",
            element: <ServicesPage />,
          },
          {
            path: "settings",
            element: <SettingsPage />,
          },
        ],
      },
    ],
  },
]);

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <RouterProvider router={router} />
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
