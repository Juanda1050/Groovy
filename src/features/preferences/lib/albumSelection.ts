import type { CatalogAlbum } from "@/models/catalog";

function seededRank(seed: string, id: string): number {
  const value = `${seed}:${id}`;
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  }

  return hash >>> 0;
}

export function orderBySeed<T extends { id: string }>(
  items: readonly T[],
  seed: string,
): T[] {
  return [...items].sort((left, right) => {
    const difference = seededRank(seed, left.id) - seededRank(seed, right.id);

    if (difference !== 0) return difference;
    if (left.id === right.id) return 0;

    return left.id < right.id ? -1 : 1;
  });
}

export function mixArtistAlbums(
  groups: readonly {
    id: string;
    items: readonly CatalogAlbum[];
  }[],
  seed: string,
): CatalogAlbum[] {
  const orderedGroups = orderBySeed(groups, `${seed}:artists`).map((group) => ({
    id: group.id,
    items: orderBySeed(group.items, `${seed}:${group.id}`),
  }));

  const result: CatalogAlbum[] = [];
  const seenIds = new Set<string>();
  const rounds = Math.max(
    0,
    ...orderedGroups.map((group) => group.items.length),
  );

  for (let round = 0; round < rounds; round += 1) {
    for (const group of orderedGroups) {
      const album = group.items[round];

      if (!album || seenIds.has(album.id)) continue;

      seenIds.add(album.id);
      result.push(album);
    }
  }

  return result;
}

function albumChoiceKey(album: CatalogAlbum): string {
  const name = album.name
    .normalize("NFC")
    .trim()
    .replace(/\s+/gu, " ")
    .toLowerCase();

  const artistIds = [
    ...new Set(album.artists.map((artist) => artist.id)),
  ].sort();

  if (
    !name ||
    artistIds.length === 0 ||
    artistIds.some((id) => !id) ||
    !album.releaseDate ||
    !Number.isInteger(album.totalTracks) ||
    album.totalTracks <= 0
  ) {
    return JSON.stringify(["id", album.id]);
  }

  return JSON.stringify([
    "edition",
    artistIds,
    name,
    album.releaseDate,
    album.totalTracks,
  ]);
}

export function uniqueAlbumChoices(
  albums: readonly CatalogAlbum[],
  retainedIds: ReadonlySet<string>,
): CatalogAlbum[] {
  const groups = new Map<string, CatalogAlbum[]>();
  const seenIds = new Set<string>();

  for (const album of albums) {
    if (seenIds.has(album.id)) continue;

    seenIds.add(album.id);

    const key = albumChoiceKey(album);
    const group = groups.get(key);

    if (group) {
      group.push(album);
    } else {
      groups.set(key, [album]);
    }
  }

  return Array.from(groups.values()).flatMap((group) => {
    const retained = group.filter((album) => retainedIds.has(album.id));

    if (retained.length > 0) return retained;

    const first = group[0];
    return first ? [first] : [];
  });
}
