import { CatalogError } from "@/lib/catalogError";

export function getLibraryErrorCode(error: unknown): string {
  if (error instanceof CatalogError) {
    return error.code;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "SERVER_ERROR";
}

export function getLibraryRetrySeconds(error: unknown): number {
  if (error instanceof CatalogError && error.retryAfter > 0) {
    return Math.ceil(error.retryAfter);
  }

  if (
    typeof error !== "object" ||
    error === null ||
    !("details" in error) ||
    typeof error.details !== "string"
  ) {
    return 60;
  }

  try {
    const details: unknown = JSON.parse(error.details);

    if (
      typeof details === "object" &&
      details !== null &&
      "retryAfterSeconds" in details &&
      typeof details.retryAfterSeconds === "number" &&
      Number.isFinite(details.retryAfterSeconds)
    ) {
      return Math.max(1, Math.ceil(details.retryAfterSeconds));
    }
  } catch {
    return 60;
  }

  return 60;
}
