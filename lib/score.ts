import type { Scores } from "@/types";
export const weights: Scores = {
  technical: 25,
  content: 20,
  index: 15,
  authority: 15,
  performance: 15,
  cwv: 10,
};
export function seoScore(scores: Scores | null) {
  if (!scores) return null;
  return Math.round(
    (Object.keys(weights) as (keyof Scores)[]).reduce(
      (sum, k) =>
        sum + (Math.max(0, Math.min(100, scores[k])) * weights[k]) / 100,
      0,
    ),
  );
}
export const number = (n: number | null | undefined) =>
  n == null
    ? "—"
    : Intl.NumberFormat("en", {
        notation: n > 9999 ? "compact" : "standard",
        maximumFractionDigits: 1,
      }).format(n);
