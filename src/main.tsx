import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import { i18nReady } from "./app/i18n";
import "./index.css";

async function bootstrap() {
  await i18nReady;

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <Suspense
        fallback={
          <div role="status" className="p-6">
            Groovy…
          </div>
        }
      >
        <App />
      </Suspense>
    </StrictMode>,
  );
}

void bootstrap();
