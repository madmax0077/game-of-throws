/**
 * Cricket scorebook conventions for the "Last balls" pills on the
 * scoreboard pages. Keeps watch, match-detail and live-scoring views
 * showing the same symbols so a viewer can decode any over at a glance.
 *
 *   W        — wicket
 *   4 / 6    — boundary off the bat
 *   Wd       — wide (no extra runs taken). "Wd2" when batters ran 2 on it.
 *   Nb       — no-ball (no extra runs taken). "Nb2" when batters ran 2 on it.
 *   B2       — bye (the figure is the runs)
 *   Lb1      — leg-bye
 *   P5       — penalty
 *   1, 2, 3  — plain runs off the bat
 *
 * For WIDE and NO_BALL the persisted ball is recorded as
 *   { runs: <runs the batters took>, extraRuns: 1, extraType: "WIDE" | "NO_BALL" }
 * because the +1 penalty is automatic. So the number shown on the pill is
 * the *additional* runs scored on the delivery, i.e. just `runs`. When that
 * is 0 the pill is "Wd" / "Nb" — never "Wd1" / "Nb1" purely from the penalty.
 */
export type BallLike = {
  runs: number;
  extraRuns?: number | null;
  extraType?: string | null;
  isWicket: boolean;
};

export function ballPillText(b: BallLike): string {
  if (b.isWicket) return "W";

  const offBat = b.runs ?? 0;
  const extras = b.extraRuns ?? 0;

  switch (b.extraType) {
    case "WIDE":
      // offBat = any byes/runs taken on top of the wide penalty.
      return offBat > 0 ? `Wd${offBat}` : "Wd";
    case "NO_BALL":
      // offBat = runs scored off the bat (or byes) on top of the no-ball penalty.
      return offBat > 0 ? `Nb${offBat}` : "Nb";
    case "BYE":
      // For byes/leg-byes the runs are tracked in extraRuns (no off-bat credit).
      return extras > 0 ? `B${extras}` : "B";
    case "LEG_BYE":
      return extras > 0 ? `Lb${extras}` : "Lb";
    case "PENALTY":
      return `P${offBat + extras}`;
    default:
      return String(offBat);
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
