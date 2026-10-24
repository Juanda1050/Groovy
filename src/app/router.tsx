import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "./App";
import ProtectedLayout from "@/pages/ProtectedLayout";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "auth",
        lazy: async () => ({
          Component: (await import("@/pages/AuthPage")).default,
        }),
      },
      {
        element: <ProtectedLayout />,
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import("@/pages/DiscoverPage")).default,
            }),
          },
          {
            path: "onboarding",
            lazy: async () => ({
              Component: (await import("@/pages/OnboardingPage")).default,
            }),
          },
          {
            path: "library",
            lazy: async () => ({
              Component: (await import("@/pages/LibraryPage")).default,
            }),
          },
          {
            path: "community",
            lazy: async () => ({
              Component: (await import("@/pages/CommunityPage")).default,
            }),
          },
          {
            path: "profile",
            lazy: async () => ({
              Component: (await import("@/pages/ProfilePage")).default,
            }),
          },
        ],
      },
      {
        path: "*",
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
