import type { AlbumDetail } from "@/models/albumDetail";

export function useAlbumMetadata(
  album: AlbumDetail["album"] | undefined,
  language: string,
) {
  const artistsLabel =
    album?.artists.map((artist) => artist.name).join(", ") ?? "";

  const releaseDateLabel = (() => {
    const value = album?.releaseDate;

    if (!value) return null;

    const locale = language.toLowerCase().startsWith("es") ? "es-ES" : "en-US";

    function capitalizeMonth(month: string): string {
      return month.charAt(0).toLocaleUpperCase(locale) + month.slice(1);
    }

    if (/^\d{4}$/.test(value)) {
      return value;
    }

    const monthMatch = /^(\d{4})-(\d{2})$/.exec(value);

    if (monthMatch) {
      const year = monthMatch[1];
      const month = Number(monthMatch[2]);

      if (month < 1 || month > 12) return null;

      const date = new Date(`${value}-01T00:00:00Z`);

      const monthName = new Intl.DateTimeFormat(locale, {
        month: "long",
        timeZone: "UTC",
      }).format(date);

      return `${capitalizeMonth(monthName)} ${year}`;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return null;
    }

    const date = new Date(`${value}T00:00:00Z`);

    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      return null;
    }

    const parts = new Intl.DateTimeFormat(locale, {
      month: "long",
      day: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    }).formatToParts(date);

    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    const year = parts.find((part) => part.type === "year")?.value;

    if (!month || !day || !year) return null;

    return `${capitalizeMonth(month)} ${day}, ${year}`;
  })();

  return {
    artistsLabel,
    releaseDateLabel,
  };
}
