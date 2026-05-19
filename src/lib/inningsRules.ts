/**
 * Cricket innings rule helpers.
 *
 * Two separate product concepts:
 *   - Super Over 1 (`superOverOneActive` on innings 1–2): 2× team runs for
 *     the current over only; full match overs and wicket rules apply.
 *   - Super Over tie-break (`isSuperOver` on innings #3+): one over each side,
 *     max 2 wickets, 2× team runs for the whole leg.
 */

export type InningsRuleContext = {
  isSuperOver: boolean;
  superOverOneActive?: boolean;
  number: number;
};

/** Tie-break super over after a tied match (innings #3, #4, …). */
export function isDedicatedSuperOverInnings(innings: InningsRuleContext): boolean {
  return innings.isSuperOver && innings.number >= 3;
}

export function isRegularInnings(innings: InningsRuleContext): boolean {
  return innings.number <= 2;
}

/** Team-run multiplier for a single ball being recorded. */
export function ballTeamRunsMultiplier(innings: InningsRuleContext): number {
  if (isDedicatedSuperOverInnings(innings)) return 2;
  if (isRegularInnings(innings) && innings.superOverOneActive) return 2;
  return 1;
}

export function inningsOverLimitBalls(
  innings: InningsRuleContext,
  matchOvers: number
): number {
  return isDedicatedSuperOverInnings(innings) ? 6 : matchOvers * 6;
}

/** Wickets at which the batting side is all out (need one batter left). */
export function maxWicketsForAllOut(
  battingTeamPlayerCount: number,
  innings: InningsRuleContext
): number {
  const battersInLineup = isDedicatedSuperOverInnings(innings)
    ? Math.min(Math.max(battingTeamPlayerCount, 2), 3)
    : Math.max(battingTeamPlayerCount, 2);
  return battersInLineup - 1;
}

export function isAllOut(
  totalWickets: number,
  battingTeamPlayerCount: number,
  innings: InningsRuleContext
): boolean {
  return totalWickets >= maxWicketsForAllOut(battingTeamPlayerCount, innings);
}

/** @deprecated Use ballTeamRunsMultiplier — kept for callers that only need dedicated SO. */
export function teamScoreMultiplier(innings: InningsRuleContext): number {
  return isDedicatedSuperOverInnings(innings) ? 2 : 1;
}
