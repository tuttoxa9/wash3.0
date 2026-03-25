import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/layout/Layout";
import { AuthProvider } from "@/lib/context/AuthContext";
import { NotificationProvider } from "@/lib/context/NotificationContext";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import RecordsPage from "@/pages/RecordsPage";
import ReportsPage from "@/pages/ReportsPage";
import SettingsPage from "@/pages/SettingsPage";
import PayoutsPage from "@/pages/PayoutsPage";
import { RouterProvider, createBrowserRouter } from "react-router-dom";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
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
