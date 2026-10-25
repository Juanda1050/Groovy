export function toStars(rating: number | null): number {
  if (rating === null) return 0;

  return Math.min(5, Math.max(0, rating / 2));
}

export function toStoredRating(stars: number): number {
  if (
    !Number.isFinite(stars) ||
    stars < 1 ||
    stars > 5 ||
    !Number.isInteger(stars * 2)
  ) {
    throw new Error("INVALID_RATING");
  }

  return stars * 2;
}

export function getStarSelection(
  star: number,
  pointerX: number,
  left: number,
  width: number,
): number {
  const half = pointerX - left < width / 2;

  return Math.max(1, half ? star - 0.5 : star);
}
