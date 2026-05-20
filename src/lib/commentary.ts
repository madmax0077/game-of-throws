/**
 * Pure helpers that turn a chronological list of balls into the
 * Cricinfo-style ball-by-ball commentary blocks (one card per over,
 * latest over at the top) we render on /matches/[id] and /watch/[id].
 *
 * No React, no Prisma — just data in, data out — so it stays trivial
 * to test and to share between the signed-in match page and the public
 * watch page.
 *
 * "Runs in over" / cumulative running totals here use RAW runs
 * (`ball.runs + ball.extraRuns`), not multiplied team runs. The
 * official innings total at the top of the page already shows the
 * multiplied figure if any Super-Over-1 doubling is in play.
 */

import { ballPillColor, ballPillText, type BallLike } from "./ballLabel";

export type CommentaryBallInput = {
  id: string;
  runs: number;
  extraType: string | null;
  extraRuns: number;
  isWicket: boolean;
  wicketType: string | null;
  legal: boolean;
  overNumber: number; // 0-indexed in DB
  ballInOver: number; // 1-indexed in DB
  bowlerId: string;
  strikerId: string;
  nonStrikerId: string;
  outBatterId: string | null;
  fielderId: string | null;
};

export type CommentaryBallRow = {
  id: string;
  /** "18.5" — over.ball with the legal-balls counter applied. */
  label: string;
  /** "•", "1", "Wd", "W" etc. — same scorebook glyphs as the pill row. */
  pill: string;
  /** Tailwind class for the coloured pill background. */
  pillClass: string;
  /** "Prince Yadav to Ferreira, no run" */
  text: string;
  isWicket: boolean;
  isFour: boolean;
  isSix: boolean;
};

export type CommentaryBatter = {
  id: string;
  name: string;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  notOut: boolean;
};

export type CommentaryBowler = {
  id: string;
  name: string;
  oversText: string;
  maidens: number;
  runsConceded: number;
  wickets: number;
};

export type CommentaryOverRow = {
  /** 1-indexed display number (DB overNumber + 1). */
  overNumber: number;
  runsInOver: number;
  wicketsInOver: number;
  endTotalRuns: number;
  endTotalWickets: number;
  endLegalBalls: number;
  /** Current run rate at the end of this over (RPO). */
  crr: number;
  /** Required run rate (chase innings only). */
  rrr: number | null;
  /** Final target the chasing side is aiming for, e.g. "Need 12 runs from 18b". */
  target: number | null;
  needRuns: number | null;
  needBalls: number | null;
  /** Two batters on the crease at the end of the over (or as far as we can
   *  infer from the next ball / wicket state). May be 1 if 9 down with a
   *  pending wicket between overs. */
  battersOnCrease: CommentaryBatter[];
  bowler: CommentaryBowler;
  /** Balls in chronological order (first → last). The UI usually renders
   *  them in reverse so the latest ball sits on top. */
  balls: CommentaryBallRow[];
};

export type InningsCommentary = {
  inningsNumber: number;
  isSuperOver: boolean;
  battingTeamId: string;
  bowlingTeamId: string;
  target: number | null;
  inningsOversLimit: number;
  /** Over rows in DESCENDING order (latest first). */
  overs: CommentaryOverRow[];
};

const WICKET_LABELS: Record<string, string> = {
  BOWLED: "bowled",
  CAUGHT: "caught",
  LBW: "lbw",
  RUN_OUT: "run out",
  STUMPED: "stumped",
  HIT_WICKET: "hit wicket"
};

function describeBall(
  b: CommentaryBallInput,
  nameFor: (id: string) => string
): string {
  if (b.isWicket) {
    const wicketKind = b.wicketType ? WICKET_LABELS[b.wicketType] ?? "out" : "out";
    const outName = nameFor(b.outBatterId ?? b.strikerId);
    let core = `OUT — ${outName} ${wicketKind}`;
    if (b.fielderId && (b.wicketType === "CAUGHT" || b.wicketType === "STUMPED")) {
      core += ` ${b.wicketType === "CAUGHT" ? "c" : "st"} ${nameFor(b.fielderId)}`;
    } else if (b.fielderId && b.wicketType === "RUN_OUT") {
      core = `OUT — ${outName} run out (${nameFor(b.fielderId)})`;
    }
    const totalRuns = b.runs + (b.extraRuns ?? 0);
    if (totalRuns > 0) {
      core += `, ${totalRuns} run${totalRuns === 1 ? "" : "s"} taken`;
    }
    return core;
  }

  switch (b.extraType) {
    case "WIDE":
      return b.runs > 0
        ? `wide + ${b.runs} run${b.runs === 1 ? "" : "s"}`
        : "wide";
    case "NO_BALL":
      return b.runs > 0
        ? `no ball + ${b.runs} run${b.runs === 1 ? "" : "s"} off the bat`
        : "no ball";
    case "BYE":
      return `${b.runs} bye${b.runs === 1 ? "" : "s"}`;
    case "LEG_BYE":
      return `${b.runs} leg bye${b.runs === 1 ? "" : "s"}`;
    case "PENALTY":
      return `${b.runs + (b.extraRuns ?? 0)} penalty runs`;
  }

  if (b.runs === 0) return "no run";
  if (b.runs === 4) return "FOUR runs";
  if (b.runs === 6) return "SIX runs";
  return `${b.runs} run${b.runs === 1 ? "" : "s"}`;
}

export function buildInningsCommentary(args: {
  inningsNumber: number;
  isSuperOver: boolean;
  battingTeamId: string;
  bowlingTeamId: string;
  /** Total overs allotted to this innings (1 for super over, else match overs). */
  inningsOversLimit: number;
  /** Target to chase, if any (innings #2 or super-over leg #2). */
  target: number | null;
  balls: CommentaryBallInput[];
  nameFor: (id: string) => string;
}): InningsCommentary {
  const {
    inningsNumber,
    isSuperOver,
    battingTeamId,
    bowlingTeamId,
    inningsOversLimit,
    target,
    balls,
    nameFor
  } = args;

  // Per-batter cumulative stats up to *now*.
  type BatAcc = {
    runs: number;
    ballsFaced: number;
    fours: number;
    sixes: number;
    out: boolean;
    name: string;
  };
  const batAcc = new Map<string, BatAcc>();
  const ensureBat = (id: string): BatAcc => {
    let v = batAcc.get(id);
    if (!v) {
      v = {
        runs: 0,
        ballsFaced: 0,
        fours: 0,
        sixes: 0,
        out: false,
        name: nameFor(id)
      };
      batAcc.set(id, v);
    }
    return v;
  };

  // Per-bowler cumulative stats.
  type BowlAcc = {
    legalBalls: number;
    runsConceded: number;
    wickets: number;
    name: string;
    /** Per-over runs conceded; entries cleared as we close each over. */
    perOverConceded: Map<number, number>;
    maidens: number;
  };
  const bowlAcc = new Map<string, BowlAcc>();
  const ensureBowl = (id: string): BowlAcc => {
    let v = bowlAcc.get(id);
    if (!v) {
      v = {
        legalBalls: 0,
        runsConceded: 0,
        wickets: 0,
        name: nameFor(id),
        perOverConceded: new Map(),
        maidens: 0
      };
      bowlAcc.set(id, v);
    }
    return v;
  };

  // Group balls by overNumber so we can assemble one card per over.
  const byOver = new Map<number, CommentaryBallInput[]>();
  for (const b of balls) {
    if (!byOver.has(b.overNumber)) byOver.set(b.overNumber, []);
    byOver.get(b.overNumber)!.push(b);
  }
  const orderedOverNumbers = Array.from(byOver.keys()).sort((a, b) => a - b);

  let cumRuns = 0;
  let cumWickets = 0;
  let cumLegal = 0;

  const overRows: CommentaryOverRow[] = [];

  for (let oi = 0; oi < orderedOverNumbers.length; oi++) {
    const overNo = orderedOverNumbers[oi];
    const ballsInOver = byOver.get(overNo)!;
    const isLastOverInData = oi === orderedOverNumbers.length - 1;
    const nextOverFirstBall = isLastOverInData
      ? null
      : byOver.get(orderedOverNumbers[oi + 1])![0];

    let runsInOver = 0;
    let wicketsInOver = 0;
    const rows: CommentaryBallRow[] = [];

    // Track legal balls within this over so the per-ball "label" is built
    // from a running counter (ignores wides/no-balls so they don't bump
    // the over.ball number — same convention as cricket scorebooks).
    let legalInOver = 0;
    let bowlerForOver = ballsInOver[0].bowlerId;
    let bowlerRunsInOver = 0;
    let bowlerLegalInOver = 0;

    for (const b of ballsInOver) {
      // Bowler stats
      const bowl = ensureBowl(b.bowlerId);
      if (b.legal) {
        bowl.legalBalls += 1;
        legalInOver += 1;
        if (b.bowlerId === bowlerForOver) bowlerLegalInOver += 1;
      }
      const conceded =
        b.extraType === "BYE" || b.extraType === "LEG_BYE"
          ? 0
          : b.runs + (b.extraRuns ?? 0);
      bowl.runsConceded += conceded;
      if (b.bowlerId === bowlerForOver) bowlerRunsInOver += conceded;
      if (b.isWicket && b.wicketType && b.wicketType !== "RUN_OUT") {
        bowl.wickets += 1;
      }

      // Batter stats — striker faces every ball, even on extras of WIDE
      // (legal=false → still counts to runs if any), but only LEGAL balls
      // count as "balls faced".
      const offBat =
        b.extraType === "BYE" || b.extraType === "LEG_BYE" ? 0 : b.runs;
      const bat = ensureBat(b.strikerId);
      bat.runs += offBat;
      if (b.legal) bat.ballsFaced += 1;
      if (offBat === 4) bat.fours += 1;
      if (offBat === 6) bat.sixes += 1;

      if (b.isWicket) {
        const outId = b.outBatterId ?? b.strikerId;
        ensureBat(outId).out = true;
        wicketsInOver += 1;
      }

      // Ball totals
      const ballRunsRaw = b.runs + (b.extraRuns ?? 0);
      runsInOver += ballRunsRaw;
      cumRuns += ballRunsRaw;
      if (b.legal) cumLegal += 1;
      if (b.isWicket) cumWickets += 1;

      // Build per-ball commentary row
      const labelOver = overNo + 1;
      // For an illegal delivery the ball "stays" at the next legal-ball
      // count, but we don't bump legalInOver until a legal ball arrives.
      // To match Cricinfo we show the legal-ball count + a small marker;
      // simpler: just use the running legalInOver (0 before any legal
      // ball in this over → label "N.0" reads oddly), so we bias to
      // `Math.max(1, legalInOver)` so the very first illegal ball reads
      // "N.1".
      const legalForLabel = Math.max(1, legalInOver);
      const label = `${labelOver}.${legalForLabel}`;

      const pillBall: BallLike = {
        runs: b.runs,
        extraRuns: b.extraRuns,
        extraType: b.extraType,
        isWicket: b.isWicket
      };
      const pill = ballPillText(pillBall);
      const pillClass = ballPillColor(pillBall);
      const text = `${nameFor(b.bowlerId)} to ${nameFor(b.strikerId)}, ${describeBall(b, nameFor)}`;

      rows.push({
        id: b.id,
        label,
        pill,
        pillClass,
        text,
        isWicket: b.isWicket,
        isFour: !b.extraType && offBat === 4,
        isSix: !b.extraType && offBat === 6
      });
    }

    // Close out maiden bookkeeping for the over: if the bowler who started
    // this over completed it (6 legal balls) AND conceded 0 runs, it's a
    // maiden. (We don't count mid-over bowler swaps as maidens — rare in
    // amateur cricket anyway.)
    if (bowlerLegalInOver === 6 && bowlerRunsInOver === 0) {
      ensureBowl(bowlerForOver).maidens += 1;
    }

    // Figure out who's on the crease at end-of-over for the BATTER pair card.
    // Easiest: peek at the next ball in this innings; that's exactly the pair
    // about to face. If there's no next ball (innings still going on this
    // last over, or innings already closed), fall back to the last ball's
    // pair without trying to apply strike rotation — it's a "best guess"
    // for the display.
    const pairBall = nextOverFirstBall ?? ballsInOver[ballsInOver.length - 1];
    const pairIds = [pairBall.strikerId, pairBall.nonStrikerId];
    const battersOnCrease: CommentaryBatter[] = pairIds.map((id) => {
      const acc = ensureBat(id);
      return {
        id,
        name: acc.name,
        runs: acc.runs,
        ballsFaced: acc.ballsFaced,
        fours: acc.fours,
        sixes: acc.sixes,
        notOut: !acc.out
      };
    });

    // Bowler stats card — for the bowler who ACTUALLY bowled this over.
    const bowlForCard = ensureBowl(bowlerForOver);
    const overs = Math.floor(bowlForCard.legalBalls / 6);
    const rem = bowlForCard.legalBalls % 6;
    const bowlerCard: CommentaryBowler = {
      id: bowlerForOver,
      name: bowlForCard.name,
      oversText: `${overs}.${rem}`,
      maidens: bowlForCard.maidens,
      runsConceded: bowlForCard.runsConceded,
      wickets: bowlForCard.wickets
    };

    // Rates
    const oversFaced = cumLegal / 6;
    const crr = oversFaced > 0 ? cumRuns / oversFaced : 0;
    const totalBallsInInnings = inningsOversLimit * 6;
    let rrr: number | null = null;
    let needRuns: number | null = null;
    let needBalls: number | null = null;
    if (target !== null) {
      needRuns = Math.max(0, target - cumRuns);
      needBalls = Math.max(0, totalBallsInInnings - cumLegal);
      const remOvers = needBalls / 6;
      rrr = remOvers > 0 ? needRuns / remOvers : 0;
    }

    overRows.push({
      overNumber: overNo + 1,
      runsInOver,
      wicketsInOver,
      endTotalRuns: cumRuns,
      endTotalWickets: cumWickets,
      endLegalBalls: cumLegal,
      crr,
      rrr,
      target,
      needRuns,
      needBalls,
      battersOnCrease,
      bowler: bowlerCard,
      balls: rows
    });
  }

  // Latest over first.
  overRows.reverse();

  return {
    inningsNumber,
    isSuperOver,
    battingTeamId,
    bowlingTeamId,
    target,
    inningsOversLimit,
    overs: overRows
  };
}
