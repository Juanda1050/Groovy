import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "./App";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        lazy: async () => {
          const { default: Component } = await import("@/pages/DiscoverPage");

          return { Component };
        },
      },
      {
        path: "library",
        lazy: async () => {
          const { default: Component } = await import("@/pages/LibraryPage");

          return { Component };
        },
      },
      {
        path: "community",
        lazy: async () => {
          const { default: Component } = await import("@/pages/CommunityPage");

          return { Component };
        },
      },
      {
        path: "profile",
        lazy: async () => {
          const { default: Component } = await import("@/pages/ProfilePage");

          return { Component };
        },
      },
      {
        path: "*",
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
