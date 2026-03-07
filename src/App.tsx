import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/layout/Layout";
import { AppProvider } from "@/lib/context/AppContext";
import { AuthProvider } from "@/lib/context/AuthContext";
import { NotificationProvider } from "@/lib/context/NotificationContext";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import RecordsPage from "@/pages/RecordsPage";
import ReportsPage from "@/pages/ReportsPage";
import SettingsPage from "@/pages/SettingsPage";
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
      <AppProvider>
        <NotificationProvider>
          <RouterProvider router={router} />
        </NotificationProvider>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
