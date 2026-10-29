import { createBrowserRouter, Navigate } from "react-router-dom";

import App from "@/app/App";
import ProtectedLayout from "@/app/layouts/ProtectedLayout";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "auth",
        lazy: async () => ({
          Component: (await import("@/features/auth/pages/AuthPage")).default,
        }),
      },
      {
        element: <ProtectedLayout />,
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import("@/features/catalog/pages/DiscoverPage"))
                .default,
            }),
          },
          {
            path: "onboarding",
            lazy: async () => ({
              Component: (
                await import("@/features/profile/pages/OnboardingPage")
              ).default,
            }),
          },
          {
            path: "musicOnboarding",
            lazy: async () => ({
              Component: (
                await import("@/features/preferences/pages/MusicOnboardingPage")
              ).default,
            }),
          },
          {
            path: "library",
            lazy: async () => ({
              Component: (await import("@/features/library/pages/LibraryPage"))
                .default,
            }),
          },
          {
            path: "albums/:albumId",
            lazy: async () => ({
              Component: (
                await import("@/features/catalog/pages/AlbumDetailPage")
              ).default,
            }),
          },
          {
            path: "community",
            lazy: async () => ({
              Component: (
                await import("@/features/community/pages/CommunityPage")
              ).default,
            }),
          },
          {
            path: "profile",
            lazy: async () => ({
              Component: (await import("@/features/profile/pages/ProfilePage"))
                .default,
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
