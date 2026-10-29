import {
  useInfiniteQuery,
  useIsMutating,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { toast } from "@/app/queryClient";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { CatalogError } from "@/features/catalog/lib/catalogError";
import { useSpotifyNetworkStore } from "@/features/catalog/stores/spotifyNetworkStore";
import {
  getLibraryErrorCode,
  getLibraryRetrySeconds,
} from "@/features/library/lib/libraryErrors";
import { musicOnboardingKey } from "@/features/preferences/hooks/useMusicOnboarding";
import {
  addSelectedArtist,
  uniqueArtists,
} from "@/features/preferences/lib/artistSelection";
import {
  completeMusicOnboarding,
  getOnboardingArtists,
} from "@/features/preferences/services/musicOnboardingService";
import type {
  ArtistCatalogRequest,
  OnboardingArtist,
  OnboardingFavorites,
} from "@/models/musicOnboarding";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";

function useRemainingSeconds(deadline: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const remaining = deadline - Date.now();

    if (remaining <= 0) {
      const timer = window.setTimeout(() => setNow(Date.now()), 0);

      return () => window.clearTimeout(timer);
    }

    const interval = window.setInterval(() => setNow(Date.now()), 1000);

    const timeout = window.setTimeout(() => {
      setNow(Date.now());
      window.clearInterval(interval);
    }, remaining + 20);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [deadline]);

  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

export function useArtistOnboarding() {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const sharedDeadline = useSpotifyNetworkStore((state) => state.blockedUntil);

  const { t } = useTranslation("onboarding");
  const client = useQueryClient();
  const navigate = useNavigate();

  const [seed] = useState(
    () => crypto.getRandomValues(new Uint32Array(1))[0] ?? 0,
  );

  const [search, setSearch] = useState("");
  const queryText = useDebouncedValue(search.trim(), 350);
  const settling = search.trim() !== queryText;

  const [failedImages, setFailedImages] = useState<Record<string, string>>({});

  const [draft, setDraft] = useState<{
    userId: string | null;
    artists: OnboardingArtist[];
    announcement: {
      kind: "selected" | "removed";
      name: string;
    } | null;
  }>({
    userId,
    artists: [],
    announcement: null,
  });

  const [history, setHistory] = useState<{
    userId: string | null;
    artists: OnboardingArtist[];
  }>({
    userId,
    artists: [],
  });

  const [pendingContext, setPendingContext] = useState<{
    userId: string;
    genre: string;
    startOffset: number;
    sequence: number;
  } | null>(null);

  const context = useDebouncedValue(pendingContext, 750);
  const activeGenre = context?.userId === userId ? context.genre : null;

  const settlingExpansion =
    pendingContext?.userId === userId &&
    pendingContext.sequence !== context?.sequence;

  const handledExpansion = useRef("");

  const selected = draft.userId === userId ? draft.artists : [];
  const announcement = draft.userId === userId ? draft.announcement : null;

  const [catalogPause, setCatalogPause] = useState({
    userId,
    until: 0,
  });

  const catalogDeadline = Math.max(
    sharedDeadline,
    catalogPause.userId === userId ? catalogPause.until : 0,
  );

  const retrySeconds = useRemainingSeconds(catalogDeadline);
  const catalogBlocked = retrySeconds > 0;

  const [savePause, setSavePause] = useState({
    userId,
    until: 0,
  });

  const saveRetrySeconds = useRemainingSeconds(
    savePause.userId === userId ? savePause.until : 0,
  );

  const writeKey = ["musicOnboardingWrite", userId];
  const writes = useIsMutating({ mutationKey: writeKey });
  const saving = writes > 0;

  useEffect(() => {
    if (!settling) {
      return;
    }

    void client.cancelQueries({
      queryKey: ["onboardingArtists", userId],
    });

    void client.cancelQueries({
      queryKey: ["onboardingArtistExpansion", userId],
    });
  }, [client, userId, settling, search]);

  function onCatalogError(error: unknown): void {
    if (!userId || useAuthStore.getState().user?.id !== userId) {
      return;
    }

    const code = getLibraryErrorCode(error);

    if (code !== "RATE_LIMITED" && code !== "SPOTIFY_QUOTA") {
      return;
    }

    const until = Date.now() + getLibraryRetrySeconds(error) * 1000;

    setCatalogPause((current) => ({
      userId,
      until: Math.max(current.userId === userId ? current.until : 0, until),
    }));
  }

  async function requestPage(
    request: ArtistCatalogRequest,
    signal: AbortSignal,
  ) {
    if (!userId) {
      throw new Error("AUTH_REQUIRED");
    }

    const deadline = Math.max(
      catalogDeadline,
      useSpotifyNetworkStore.getState().blockedUntil,
    );

    const remaining = deadline - Date.now();

    if (remaining > 0) {
      throw new CatalogError("RATE_LIMITED", Math.ceil(remaining / 1000));
    }

    try {
      return await getOnboardingArtists(userId, request, signal);
    } catch (error: unknown) {
      if (!signal.aborted) {
        onCatalogError(error);
      }

      throw error;
    }
  }

  const query = useInfiniteQuery({
    queryKey: ["onboardingArtists", userId, seed, queryText],
    enabled: Boolean(userId) && !settling,
    initialPageParam: 0,

    queryFn: ({ pageParam, signal }) =>
      requestPage(
        queryText
          ? {
              action: "artists",
              query: queryText,
              offset: pageParam,
            }
          : {
              action: "artists",
              seed,
              batch: pageParam,
            },
        signal,
      ),

    getNextPageParam: (page) =>
      (queryText ? page.nextOffset : page.nextBatch) ?? undefined,

    maxPages: 6,
    staleTime: 5 * 60_000,
    gcTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const expansion = useInfiniteQuery({
    queryKey: ["onboardingArtistExpansion", userId, activeGenre],
    enabled: false,
    initialPageParam: context?.userId === userId ? context.startOffset : 0,

    queryFn: ({ pageParam, signal }) => {
      if (!activeGenre) {
        throw new Error("INVALID_MUSIC_PREFERENCE");
      }

      return requestPage(
        {
          action: "artists",
          query: `genre:"${activeGenre}"`,
          offset: pageParam,
          seed,
        },
        signal,
      );
    },

    getNextPageParam: (page) => page.nextOffset ?? undefined,

    maxPages: 6,
    staleTime: 5 * 60_000,
    gcTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const queryFetching = query.isFetching;

  const {
    data: expansionData,
    isFetching: expansionFetching,
    hasNextPage: expansionHasNextPage,
    refetch: refetchExpansion,
    fetchNextPage: fetchNextExpansionPage,
  } = expansion;

  useEffect(() => {
    if (
      !userId ||
      !context ||
      context.userId !== userId ||
      !activeGenre ||
      queryText ||
      settling ||
      catalogBlocked ||
      saving ||
      queryFetching ||
      expansionFetching
    ) {
      return;
    }

    const identifier = `${userId}:${context.genre}:${context.sequence}`;

    if (handledExpansion.current === identifier) {
      return;
    }

    handledExpansion.current = identifier;

    if (!expansionData) {
      void refetchExpansion();
    } else if (expansionHasNextPage) {
      void fetchNextExpansionPage({ cancelRefetch: false });
    }
  }, [
    userId,
    context,
    activeGenre,
    queryText,
    settling,
    catalogBlocked,
    saving,
    queryFetching,
    expansionFetching,
    expansionData,
    expansionHasNextPage,
    refetchExpansion,
    fetchNextExpansionPage,
  ]);

  const mutation = useMutation({
    mutationKey: writeKey,
    mutationFn: completeMusicOnboarding,
    retry: false,

    onSuccess: async (saved, request) => {
      await client.cancelQueries({
        queryKey: musicOnboardingKey(request.userId),
      });

      if (useAuthStore.getState().user?.id !== request.userId) {
        return;
      }

      client.setQueryData(musicOnboardingKey(request.userId), saved);

      await client.cancelQueries({
        queryKey: ["musicPreferences", request.userId],
      });

      if (useAuthStore.getState().user?.id !== request.userId) {
        return;
      }

      void client.invalidateQueries({
        queryKey: ["musicPreferences", request.userId],
      });

      toast.add({
        type: "success",
        title: t("musicOnboarding.saved"),
        timeout: 2600,
      });

      navigate("/", { replace: true });
    },

    onError: (error, request) => {
      if (useAuthStore.getState().user?.id !== request.userId) {
        return;
      }

      if (getLibraryErrorCode(error) === "RATE_LIMITED") {
        setSavePause({
          userId: request.userId,
          until: Date.now() + getLibraryRetrySeconds(error) * 1000,
        });
      }
    },
  });

  const baseArtists = query.data?.pages.flatMap((page) => page.items) ?? [];

  const expandedArtists = !queryText
    ? (expansionData?.pages.flatMap((page) => page.items) ?? [])
    : [];

  const artists = uniqueArtists(
    queryText
      ? baseArtists
      : [
          ...(history.userId === userId ? history.artists : []),
          ...baseArtists,
          ...expandedArtists,
        ],
  )
    .slice(-180)
    .filter((artist) => failedImages[artist.id] !== artist.imageUrl);

  function onSelect(artist: OnboardingArtist): boolean {
    if (
      !userId ||
      saving ||
      selected.length >= 100 ||
      selected.some((item) => item.id === artist.id) ||
      useAuthStore.getState().user?.id !== userId ||
      client.isMutating({ mutationKey: writeKey }) > 0
    ) {
      return false;
    }

    setHistory({ userId, artists });

    setDraft((current) => ({
      userId,
      artists: addSelectedArtist(
        current.userId === userId ? current.artists : [],
        artist,
      ),
      announcement: { kind: "selected", name: artist.name },
    }));

    const genre = artist.genres[0];

    if (genre && artist.genreOffset !== 990) {
      setPendingContext((current) => ({
        userId,
        genre,
        startOffset: artist.genreOffset === null ? 0 : artist.genreOffset + 10,
        sequence: current?.userId === userId ? current.sequence + 1 : 1,
      }));

      setSearch("");
    }

    mutation.reset();

    return true;
  }

  function onRemove(id: string): void {
    if (!userId || saving || useAuthStore.getState().user?.id !== userId) {
      return;
    }

    const artist = selected.find((item) => item.id === id);

    if (!artist) {
      return;
    }

    setDraft((current) =>
      current.userId === userId
        ? {
            ...current,
            artists: current.artists.filter((item) => item.id !== id),
            announcement: { kind: "removed", name: artist.name },
          }
        : current,
    );

    mutation.reset();
  }

  function requestsBusy(): boolean {
    return (
      client.isFetching({
        queryKey: ["onboardingArtists", userId],
      }) > 0 ||
      client.isFetching({
        queryKey: ["onboardingArtistExpansion", userId],
      }) > 0
    );
  }

  function onMore(): void {
    if (
      !userId ||
      saving ||
      settling ||
      settlingExpansion ||
      catalogBlocked ||
      requestsBusy()
    ) {
      return;
    }

    if (!queryText && activeGenre && expansionHasNextPage) {
      void fetchNextExpansionPage({ cancelRefetch: false });
    } else if (query.hasNextPage) {
      void query.fetchNextPage({ cancelRefetch: false });
    }
  }

  function onRetry(): void {
    if (!userId || saving || settling || catalogBlocked || requestsBusy()) {
      return;
    }

    if (!queryText && activeGenre && expansion.isError) {
      if (expansion.isFetchNextPageError) {
        void fetchNextExpansionPage({ cancelRefetch: false });
      } else {
        void refetchExpansion();
      }
    } else if (query.isFetchNextPageError) {
      void query.fetchNextPage({ cancelRefetch: false });
    } else {
      void query.refetch();
    }
  }

  function onSubmit(
    favorites: OnboardingFavorites = {
      albumIds: [],
      trackIds: [],
      knownAlbumIds: [],
    },
  ): void {
    if (
      !userId ||
      selected.length < 3 ||
      saving ||
      saveRetrySeconds > 0 ||
      useAuthStore.getState().user?.id !== userId ||
      client.isMutating({ mutationKey: writeKey }) > 0
    ) {
      return;
    }

    mutation.mutate({
      userId,
      artistIds: selected.map((artist) => artist.id),
      albumIds: favorites.albumIds,
      trackIds: favorites.trackIds,
      knownAlbumIds: favorites.knownAlbumIds,
    });
  }

  const saveCode = getLibraryErrorCode(mutation.error);

  const errorKey = [
    "AUTH_REQUIRED",
    "SESSION_EXPIRED",
    "UNAUTHORIZED",
  ].includes(saveCode)
    ? "session"
    : saveCode === "ARTIST_METADATA_REQUIRED"
      ? "metadata"
      : saveCode === "ALBUM_METADATA_REQUIRED"
        ? "albumMetadata"
        : saveCode === "RATE_LIMITED"
          ? "rate"
          : "save";

  return {
    artists,
    selected,
    announcement,
    search,
    saving,
    catalogBlocked,
    retrySeconds,
    onSelect,
    onRemove,
    onSubmit,
    onMore,
    onRetry,
    onCatalogError,

    onSearch: (value: string) => {
      if (!saving) {
        setSearch(value);
      }
    },

    onUnavailable: (id: string, imageUrl: string) => {
      setFailedImages((current) => ({
        ...current,
        [id]: imageUrl,
      }));
    },

    loading:
      settling || settlingExpansion || queryFetching || expansionFetching,

    readError: queryText
      ? query.isError
      : expansion.isError || (query.isError && !expansionData),

    saveError: mutation.isError ? errorKey : null,

    hasMore: queryText
      ? Boolean(query.hasNextPage)
      : Boolean(expansionHasNextPage || query.hasNextPage),

    canSubmit:
      Boolean(userId) &&
      selected.length >= 3 &&
      !saving &&
      saveRetrySeconds === 0,

    atLimit: selected.length >= 100,
  };
}
