import { useEffect } from "react";
import { queryClient } from "@/app/queryClient";
import { getCurrentUser, observeAuth } from "@/services/authService";
import { useAuthStore } from "@/stores/authStore";
import type { AuthUser } from "@/models/auth";

export function useAuthBootstrap(): void {
  useEffect(() => {
    let active = true;
    let observedEvent = false;

    function applyUser(user: AuthUser | null): void {
      if (!active) return;

      const previousId = useAuthStore.getState().user?.id ?? null;
      const nextId = user?.id ?? null;

      if (previousId !== nextId) {
        queryClient.clear();
      }

      useAuthStore.getState().setUser(user);
    }

    const unsubscribe = observeAuth((user) => {
      observedEvent = true;
      applyUser(user);
    });

    void getCurrentUser()
      .then((user) => {
        if (!observedEvent) applyUser(user);
      })
      .catch(() => {
        if (!observedEvent) applyUser(null);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
}
