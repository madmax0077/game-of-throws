/**

 * Cricket innings rule helpers.

 *

 * Two separate product concepts — only ONE of them doubles the runs:

 *   - Super Over 1 (`superOverOneActive` on innings 1–2): the scorer toggles

 *     this at the start of an over inside a regular innings; every legal

 *     ball that over counts 2× on the TEAM total only (player stats stay

 *     at face value). Auto-disables at end of the over.

 *   - Super Over tie-break (`isSuperOver` on innings #3+): triggered when

 *     the regulation match ends in a tie. Each team plays exactly one over

 *     with at most 2 wickets in hand. Runs are NOT doubled — actual runs

 *     scored decide who wins the leg.

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



/**

 * Team-run multiplier for a single ball being recorded.

 *

 * The ONLY case where runs are doubled is the "Super Over 1" toggle inside

 * a regular innings (the scorer flips it at the start of an over to make

 * that one over count double on the team total). The tie-break super over

 * (innings #3+ after a tied regulation match) is straight 1× runs — the

 * actual scores decide the leg.

 */

export function ballTeamRunsMultiplier(innings: InningsRuleContext): number {

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



/**

 * @deprecated Use ballTeamRunsMultiplier. The tie-break super over does not

 * double runs any more — only the Super Over 1 toggle does — so this helper

 * is intentionally left as `1` for legacy callers that may still import it.

 */

export function teamScoreMultiplier(_innings: InningsRuleContext): number {

  return 1;

}


