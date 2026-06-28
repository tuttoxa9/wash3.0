import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/layout/Layout";
import OkleykaLayout from "@/components/okleyka/OkleykaLayout";
import { AuthProvider } from "@/lib/context/AuthContext";
import { NotificationProvider } from "@/lib/context/NotificationContext";
import { OkleykaProvider } from "@/lib/context/OkleykaContext";
import DesktopPage from "@/pages/DesktopPage";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import RecordsPage from "@/pages/RecordsPage";
import ReportsPage from "@/pages/ReportsPage";
import SettingsPage from "@/pages/SettingsPage";
import PayoutsPage from "@/pages/PayoutsPage";
import ServicesPage from "@/pages/ServicesPage";
import CrmPage from "@/pages/CrmPage";
import OkleykaHomePage from "@/pages/okleyka/OkleykaHomePage";
import OkleykaOrdersPage from "@/pages/okleyka/OkleykaOrdersPage";
import OkleykaReportsPage from "@/pages/okleyka/OkleykaReportsPage";
import OkleykaPayoutsPage from "@/pages/okleyka/OkleykaPayoutsPage";
import OkleykaUnpaidPage from "@/pages/okleyka/OkleykaUnpaidPage";
import OkleykaAppointmentsPage from "@/pages/okleyka/OkleykaAppointmentsPage";
import OkleykaSettingsPage from "@/pages/okleyka/OkleykaSettingsPage";
import { RouterProvider, createBrowserRouter } from "react-router-dom";

// Okleyka protected route wrapper with its own provider
const OkleykaProtectedRoute = () => {
  const ProtectedEl = ProtectedRoute as any;
  return <ProtectedEl />;
};

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
  {
    path: "/okleyka",
    element: <ProtectedRoute />,
    children: [
      {
        element: (
          <OkleykaProvider>
            <OkleykaLayout />
          </OkleykaProvider>
        ),
        children: [
          {
            index: true,
            element: <OkleykaHomePage />,
          },
          {
            path: "orders",
            element: <OkleykaOrdersPage />,
          },
          {
            path: "appointments",
            element: <OkleykaAppointmentsPage />,
          },
          {
            path: "reports",
            element: <OkleykaReportsPage />,
          },
          {
            path: "payouts",
            element: <OkleykaPayoutsPage />,
          },
          {
            path: "unpaid",
            element: <OkleykaUnpaidPage />,
          },
          {
            path: "settings",
            element: <OkleykaSettingsPage />,
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
