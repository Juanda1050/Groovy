import { queryClient } from "@/app/queryClient";
import { getCurrentUser,observeAuth } from "@/features/auth/services/authService";
import { useAuthStore } from "@/features/auth/stores/authStore";
import type { AuthUser } from "@/models/auth";
import type { SessionBootstrapState } from "@/models/session";
import { useEffect,useState } from "react";

export function useAuthBootstrap() {
  const [attempt, setAttempt] = useState(0);

  const [result, setResult] = useState<SessionBootstrapState>({
    attempt: 0,
    status: "loading",
  });

  useEffect(() => {
    let active = true;
    let revision = 0;
    let checking = false;
    let checkAgain = false;
    let lastCheck = 0;
    let authTimer: number | undefined;

    function applyUser(user: AuthUser | null): void {
      if (!active) return;

      const previousId = useAuthStore.getState().user?.id ?? null;
      const nextId = user?.id ?? null;

      if (previousId !== nextId) {
        queryClient.clear();
      }

      useAuthStore.getState().setUser(user);
    }

    async function synchronize(): Promise<void> {
      if (!active) return;

      if (checking) {
        checkAgain = true;
        return;
      }

      checking = true;
      const currentRevision = revision;

      try {
        const user = await getCurrentUser();

        if (!active || currentRevision !== revision) return;

        applyUser(user);
        lastCheck = Date.now();
        setResult({ attempt, status: "ready" });
      } catch {
        if (active && currentRevision === revision) {
          setResult({ attempt, status: "error" });
        }
      } finally {
        checking = false;

        if (active && checkAgain) {
          checkAgain = false;
          void synchronize();
        }
      }
    }

    const unsubscribe = observeAuth((user) => {
      if (!active) return;

      revision += 1;

      if (!user) {
        applyUser(null);
        setResult({ attempt, status: "ready" });
        return;
      }

      setResult({ attempt, status: "loading" });

      window.clearTimeout(authTimer);

      authTimer = window.setTimeout(() => {
        void synchronize();
      }, 0);
    });

    function checkVisibleSession(): void {
      if (
        document.visibilityState !== "visible" ||
        !useAuthStore.getState().user ||
        Date.now() - lastCheck < 60_000
      ) {
        return;
      }

      void synchronize();
    }

    const interval = window.setInterval(checkVisibleSession, 30 * 60_000);

    document.addEventListener("visibilitychange", checkVisibleSession);

    void synchronize();

    return () => {
      active = false;
      unsubscribe();
      window.clearTimeout(authTimer);
      window.clearInterval(interval);

      document.removeEventListener("visibilitychange", checkVisibleSession);
    };
  }, [attempt]);

  return {
    isReady: result.attempt === attempt && result.status === "ready",
    hasError: result.attempt === attempt && result.status === "error",
    retry: () => setAttempt((current) => current + 1),
  };
}
