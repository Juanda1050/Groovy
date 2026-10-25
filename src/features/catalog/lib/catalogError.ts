import type { CatalogErrorCode } from "@/models/catalog";

export class CatalogError extends Error {
  constructor(
    readonly code: CatalogErrorCode,
    readonly retryAfter = 0,
  ) {
    super(code);
  }
}
