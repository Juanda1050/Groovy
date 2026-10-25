import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";

import { i18nReady } from "./app/i18n";
import { queryClient } from "./app/queryClient";
import { router } from "./app/router";

import "./index.css";

async function bootstrap(): Promise<void> {
  await i18nReady;

  const rootElement = document.getElementById("root");

  if (!rootElement) {
    throw new Error("Application root element is missing.");
  }

  createRoot(rootElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
}

void bootstrap();
