export interface CatalogArtist {
  id: string;
  name: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  spotifyUrl: string;
  genres: string[];
  genreOffset: number | null;
}

export interface ArtistCatalogRequest {
  action: "artists";
  query?: string | undefined;
  offset: number;
  seed: number;
  batch: number;
}

export interface ArtistCatalogPage {
  items: CatalogArtist[];
  nextOffset: number | null;
  nextBatch: number | null;
}

export interface ArtistCandidate {
  artist: CatalogArtist;
  popularity: number | null;
}

export interface ArtistCandidatePage {
  items: ArtistCandidate[];
  nextOffset: number | null;
}
