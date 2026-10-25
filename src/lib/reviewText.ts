import type { ReviewLanguage } from "@/models/library";

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

export async function validateReviewLanguage(
  text: string,
  selectedLanguage: ReviewLanguage,
): Promise<void> {
  if (!text) return;

  const letters = text.match(/\p{L}/gu)?.length ?? 0;
  const words = text.match(/\p{L}+/gu)?.length ?? 0;

  if (letters < 40 || words < 7) return;

  const { francAll } = await import("franc-min");
  const results = francAll(text, { minLength: 40 });

  const first = results[0];
  const second = results[1];

  if (!first || !second) return;

  const [detected, score] = first;
  const [, nextScore] = second;

  if (score - nextScore < 0.15) return;

  if (selectedLanguage === "en" && detected === "spa") {
    throw new Error("REVIEW_APPEARS_SPANISH");
  }

  if (selectedLanguage === "es" && detected === "eng") {
    throw new Error("REVIEW_APPEARS_ENGLISH");
  }
}
