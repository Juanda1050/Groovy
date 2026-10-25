import { useLocation } from "react-router-dom";
import { z } from "zod";

const navigationStateSchema = z.object({
  discoverSearch: z.string().max(2048),
});

export function useAlbumReturn() {
  const location = useLocation();

  const navigationState: unknown = location.state;
  const parsed = navigationStateSchema.safeParse(navigationState);

  const returnParams = new URLSearchParams();
  const savedParams = new URLSearchParams(
    parsed.success ? parsed.data.discoverSearch : "",
  );

  const query = (savedParams.get("q") ?? "").slice(0, 120);
  const offset = Number(savedParams.get("offset") ?? 0);

  if (query.trim()) {
    returnParams.set("q", query);

    if (
      Number.isInteger(offset) &&
      offset > 0 &&
      offset <= 990 &&
      offset % 10 === 0
    ) {
      returnParams.set("offset", String(offset));
    }
  }

  const restoredSearch = returnParams.toString();
  const fromDiscover = parsed.success;

  return {
    detailNavigationState: {
      discoverSearch: location.search,
    },
    returnTo: fromDiscover
      ? restoredSearch
        ? `/?${restoredSearch}`
        : "/"
      : "/library",
    returnLabelKey: fromDiscover ? "backToSearch" : "library",
  };
}
