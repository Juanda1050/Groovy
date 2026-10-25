import type { ReviewLanguage } from "@/models/albumReview";

export const reviewMaxLength = 144;

export function normalizeReview(text: string): string {
  return text.normalize("NFC").replace(/\s+/gu, " ").trim();
}

export function countReviewCharacters(text: string): number {
  return Array.from(normalizeReview(text)).length;
}

export function resolveReviewLanguage(
  language: string | undefined,
): ReviewLanguage {
  return language?.toLowerCase().split("-")[0] === "es" ? "es" : "en";
}
