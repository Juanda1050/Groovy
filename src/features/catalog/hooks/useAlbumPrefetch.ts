import { useAuthStore } from "@/features/auth/stores/authStore";
import { albumDetailOptions,albumStaleTime } from "@/features/catalog/lib/albumQueries";
import { useSpotifyNetworkStore } from "@/features/catalog/stores/spotifyNetworkStore";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback,useEffect,useRef } from "react";

let prefetchRunning = false;
let lastPrefetchAt = 0;

export function useAlbumPrefetch(albumId: string) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id ?? null);

  const elementRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const prefetch = useCallback(async () => {
    if (
      !userId ||
      !/^[A-Za-z0-9]{22}$/.test(albumId) ||
      document.visibilityState !== "visible" ||
      prefetchRunning
    ) {
      return;
    }

    if (useAuthStore.getState().user?.id !== userId) return;

    const now = Date.now();

    if (
      now - lastPrefetchAt < 30_000 ||
      useSpotifyNetworkStore.getState().blockedUntil > now ||
      queryClient.isFetching() > 0
    ) {
      return;
    }

    const options = albumDetailOptions(userId, albumId);
    const cached = queryClient.getQueryState(options.queryKey);

    if (
      cached?.data !== undefined &&
      now - cached.dataUpdatedAt < albumStaleTime
    ) {
      return;
    }

    lastPrefetchAt = now;
    prefetchRunning = true;

    try {
      await queryClient.prefetchQuery({
        ...options,
        retry: false,
      });
    } finally {
      prefetchRunning = false;
    }
  }, [albumId, queryClient, userId]);

  const schedule = useCallback(
    (delay: number) => {
      cancel();

      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        void prefetch();
      }, delay);
    },
    [cancel, prefetch],
  );

  useEffect(() => {
    return cancel;
  }, [albumId, userId, cancel]);

  const onPointerEnter = useCallback(() => {
    schedule(400);
  }, [schedule]);

  const onFocus = useCallback(() => {
    schedule(150);
  }, [schedule]);

  const onTouchStart = useCallback(() => {
    schedule(0);
  }, [schedule]);

  return {
    elementRef,
    onPointerEnter,
    onPointerLeave: cancel,
    onFocus,
    onTouchStart,
  };
}
