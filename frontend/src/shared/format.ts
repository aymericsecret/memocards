export function formatLastReview(value: string | null) {
  if (!value) return "jamais revise";

  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}
