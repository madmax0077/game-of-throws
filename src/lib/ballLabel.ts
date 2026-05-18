/**
 * Cricket scorebook conventions for the "Last balls" pills on the
 * scoreboard pages. Keeps watch, match-detail and live-scoring views
 * showing the same symbols so a viewer can decode any over at a glance.
 *
 *   W       — wicket
 *   4 / 6   — boundary off the bat
 *   Wd / Wd2 — wide (number includes the penalty + any byes off it)
 *   Nb / Nb4 — no-ball (number is total credited to the team)
 *   B2      — bye (the figure is the runs)
 *   Lb1     — leg-bye
 *   P5      — penalty
 *   1, 2, 3 — plain runs off the bat
 */
export type BallLike = {
  runs: number;
  extraRuns?: number | null;
  extraType?: string | null;
  isWicket: boolean;
};

export function ballPillText(b: BallLike): string {
  if (b.isWicket) return "W";

  const extras = b.extraRuns ?? 0;
  const total = (b.runs ?? 0) + extras;

  switch (b.extraType) {
    case "WIDE":
      return `Wd${total}`;
    case "NO_BALL":
      return `Nb${total}`;
    case "BYE":
      return extras > 0 ? `B${extras}` : "B";
    case "LEG_BYE":
      return extras > 0 ? `Lb${extras}` : "Lb";
    case "PENALTY":
      return `P${total}`;
    default:
      return String(b.runs ?? 0);
  }
}

/**
 * Tailwind class string for the colored pill background, mirroring the
 * scorebook colors (wicket = black, six = green, four = amber, extras =
 * blue, plain runs = grey).
 */
export function ballPillColor(b: BallLike): string {
  if (b.isWicket) return "bg-ink-900 text-white";
  if (!b.extraType) {
    if (b.runs === 6) return "bg-emerald-500 text-white";
    if (b.runs === 4) return "bg-amber-400 text-ink-900";
  }
  if (b.extraType) return "bg-sky-100 text-sky-800";
  return "bg-ink-100 text-ink-700";
}
