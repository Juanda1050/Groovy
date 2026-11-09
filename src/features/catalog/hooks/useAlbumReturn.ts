import { useLocation } from "react-router-dom";
import { z } from "zod";

const navigationStateSchema = z.object({
  returnTo: z.literal("/community").optional(),
  discoverSearch: z.string().max(2048).optional(),
  artistReturn: z
    .object({
      artistId: z.string().regex(/^[A-Za-z0-9]{22}$/),
      offset: z.number().int().min(0).max(100_000).multipleOf(10),
      state: z.unknown().optional(),
    })
    .optional(),
});

export function useAlbumReturn() {
  const location = useLocation();
  const navigationState: unknown = location.state;
  const parsed = navigationStateSchema.safeParse(navigationState);

  const currentArtistId = location.pathname.match(
    /^\/artists\/([A-Za-z0-9]{22})$/,
  )?.[1];

  const rawOffset = Number(
    new URLSearchParams(location.search).get("offset") ?? 0,
  );

  const offset =
    Number.isInteger(rawOffset) &&
    rawOffset >= 0 &&
    rawOffset <= 100_000 &&
    rawOffset % 10 === 0
      ? rawOffset
      : 0;

  const detailNavigationState = currentArtistId
    ? {
        artistReturn: {
          artistId: currentArtistId,
          offset,
          state: location.state,
        },
      }
    : { discoverSearch: location.search };

  const fromCommunity = parsed.success && parsed.data.returnTo === "/community";

  const artistReturn = parsed.success ? parsed.data.artistReturn : undefined;

  if (!fromCommunity && artistReturn) {
    return {
      detailNavigationState,
      returnTo: `/artists/${artistReturn.artistId}${
        artistReturn.offset > 0 ? `?offset=${artistReturn.offset}` : ""
      }`,
      returnState: artistReturn.state,
      returnLabelKey: "artistDetail.back",
      returnLabelNamespace: "discover",
    };
  }

  const fromDiscover =
    !fromCommunity &&
    parsed.success &&
    parsed.data.discoverSearch !== undefined;

  const savedParams = new URLSearchParams(
    parsed.success ? (parsed.data.discoverSearch ?? "") : "",
  );

  const returnParams = new URLSearchParams();
  const query = (savedParams.get("q") ?? "").slice(0, 120);
  const savedOffset = Number(savedParams.get("offset") ?? 0);

  if (query.trim()) {
    returnParams.set("q", query);

    if (
      Number.isInteger(savedOffset) &&
      savedOffset > 0 &&
      savedOffset <= 990 &&
      savedOffset % 10 === 0
    ) {
      returnParams.set("offset", String(savedOffset));
    }
  }

  const restoredSearch = returnParams.toString();

  return {
    detailNavigationState,
    returnTo: fromCommunity
      ? "/community"
      : fromDiscover
        ? restoredSearch
          ? `/?${restoredSearch}`
          : "/"
        : "/library",
    returnState: undefined,
    returnLabelKey: fromCommunity
      ? "community"
      : fromDiscover
        ? "backToSearch"
        : "library",
    returnLabelNamespace: "album",
  };
}
