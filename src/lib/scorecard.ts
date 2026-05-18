// Pure helpers that turn raw Ball rows into the per-innings batting +
// bowling scorecards we render on /matches/[id] and /watch/[id], plus the
// per-player match-points used for the MVP panel after a match completes.
//
// We deliberately keep this server/client-agnostic (no React) so the same
// numbers can power either the live polling server page or the public
// watch page.

export type ScorecardBall = {
  id: string;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  outBatterId: string | null;
  fielderId: string | null;
  runs: number;
  extraType: string | null;
  extraRuns: number;
  isWicket: boolean;
  wicketType: string | null;
  legal: boolean;
  overNumber: number;
  ballInOver: number;
};

export type ScorecardPlayer = {
  id: string;
  name: string;
  role: string;
  isCaptain: boolean;
};

export type BatterRow = {
  player: ScorecardPlayer;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  outInfo: string | null; // null = not out, "" = did not bat
  didBat: boolean;
};

export type BowlerRow = {
  player: ScorecardPlayer;
  legalBalls: number;
  oversText: string; // "3.4"
  runsConceded: number;
  wickets: number;
  maidens: number;
  economy: number;
  noBalls: number;
  wides: number;
};

export type InningsScorecard = {
  battingTeamId: string;
  bowlingTeamId: string;
  batters: BatterRow[]; // every batter on the batting side, in batting order then "did not bat"
  bowlers: BowlerRow[]; // every bowler used, in order of first ball bowled
  extras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
    penalty: number;
    total: number;
  };
};

function offBatRuns(b: ScorecardBall): number {
  // BYE/LEG_BYE never credit the batter; everything else does.
  if (b.extraType === "BYE" || b.extraType === "LEG_BYE") return 0;
  return b.runs;
}

function bowlerConcededRuns(b: ScorecardBall): number {
  // Wides and no-balls (and runs scored off them) are charged to the bowler.
  // Byes and leg-byes are NOT charged to the bowler. Plain runs go to bowler too.
  if (b.extraType === "BYE" || b.extraType === "LEG_BYE") return 0;
  return b.runs + (b.extraRuns ?? 0);
}

function formatOversText(legalBalls: number): string {
  const overs = Math.floor(legalBalls / 6);
  const rem = legalBalls % 6;
  return `${overs}.${rem}`;
}

export function buildInningsScorecard(
  balls: ScorecardBall[],
  battingTeamId: string,
  bowlingTeamId: string,
  battingTeamPlayers: ScorecardPlayer[],
  bowlingTeamPlayers: ScorecardPlayer[]
): InningsScorecard {
  // Track batting order by first appearance as striker or non-striker.
  const batOrder: string[] = [];
  const seenBat = new Set<string>();
  const rememberBatter = (id: string) => {
    if (!seenBat.has(id)) {
      seenBat.add(id);
      batOrder.push(id);
    }
  };

  const batStats = new Map<
    string,
    {
      runs: number;
      ballsFaced: number;
      fours: number;
      sixes: number;
      outInfo: string | null;
    }
  >();
  const ensureBat = (id: string) => {
    let s = batStats.get(id);
    if (!s) {
      s = { runs: 0, ballsFaced: 0, fours: 0, sixes: 0, outInfo: null };
      batStats.set(id, s);
    }
    return s;
  };

  // Bowlers, ordered by first ball bowled.
  const bowlOrder: string[] = [];
  const seenBowl = new Set<string>();
  const bowlStats = new Map<
    string,
    {
      legalBalls: number;
      runsConceded: number;
      wickets: number;
      noBalls: number;
      wides: number;
      // For maidens: bucket runs conceded per over by this bowler.
      perOverRuns: Map<number, number>;
    }
  >();
  const ensureBowl = (id: string) => {
    if (!seenBowl.has(id)) {
      seenBowl.add(id);
      bowlOrder.push(id);
    }
    let s = bowlStats.get(id);
    if (!s) {
      s = {
        legalBalls: 0,
        runsConceded: 0,
        wickets: 0,
        noBalls: 0,
        wides: 0,
        perOverRuns: new Map()
      };
      bowlStats.set(id, s);
    }
    return s;
  };

  const extras = {
    wides: 0,
    noBalls: 0,
    byes: 0,
    legByes: 0,
    penalty: 0,
    total: 0
  };

  // Player lookups
  const battingMap = new Map(battingTeamPlayers.map((p) => [p.id, p]));
  const bowlingMap = new Map(bowlingTeamPlayers.map((p) => [p.id, p]));

  const nameOf = (id: string): string =>
    battingMap.get(id)?.name ?? bowlingMap.get(id)?.name ?? "Unknown";

  for (const b of balls) {
    rememberBatter(b.strikerId);
    rememberBatter(b.nonStrikerId);

    const bat = ensureBat(b.strikerId);
    const off = offBatRuns(b);
    bat.runs += off;
    if (b.legal) bat.ballsFaced += 1;
    if (off === 4) bat.fours += 1;
    if (off === 6) bat.sixes += 1;

    // Wicket attribution to the dismissed batter.
    if (b.isWicket) {
      const outId = b.outBatterId ?? b.strikerId;
      rememberBatter(outId);
      const outBat = ensureBat(outId);
      const fielderName = b.fielderId ? nameOf(b.fielderId) : null;
      const bowlerName = nameOf(b.bowlerId);
      switch (b.wicketType) {
        case "BOWLED":
          outBat.outInfo = `b ${bowlerName}`;
          break;
        case "LBW":
          outBat.outInfo = `lbw b ${bowlerName}`;
          break;
        case "CAUGHT":
          outBat.outInfo = fielderName
            ? `c ${fielderName} b ${bowlerName}`
            : `c & b ${bowlerName}`;
          break;
        case "STUMPED":
          outBat.outInfo = fielderName
            ? `st ${fielderName} b ${bowlerName}`
            : `st b ${bowlerName}`;
          break;
        case "RUN_OUT":
          outBat.outInfo = fielderName
            ? `run out (${fielderName})`
            : "run out";
          break;
        case "HIT_WICKET":
          outBat.outInfo = `hit wicket b ${bowlerName}`;
          break;
        default:
          outBat.outInfo = "out";
      }
    }

    // Bowler
    const bowl = ensureBowl(b.bowlerId);
    if (b.legal) bowl.legalBalls += 1;
    const conc = bowlerConcededRuns(b);
    bowl.runsConceded += conc;
    const ovRuns = bowl.perOverRuns.get(b.overNumber) ?? 0;
    bowl.perOverRuns.set(b.overNumber, ovRuns + conc);
    if (b.isWicket && b.wicketType && b.wicketType !== "RUN_OUT") {
      bowl.wickets += 1;
    }
    if (b.extraType === "WIDE") bowl.wides += 1;
    if (b.extraType === "NO_BALL") bowl.noBalls += 1;

    // Extras tally for the innings.
    if (b.extraType === "WIDE") {
      extras.wides += 1 + b.runs; // 1 penalty + any runs on the wide
    } else if (b.extraType === "NO_BALL") {
      extras.noBalls += 1 + b.runs; // 1 penalty + off-bat/byes on the no-ball
    } else if (b.extraType === "BYE") {
      extras.byes += b.extraRuns ?? 0;
    } else if (b.extraType === "LEG_BYE") {
      extras.legByes += b.extraRuns ?? 0;
    } else if (b.extraType === "PENALTY") {
      extras.penalty += b.runs + (b.extraRuns ?? 0);
    }
  }

  extras.total =
    extras.wides + extras.noBalls + extras.byes + extras.legByes + extras.penalty;

  // Compose batters in order of first appearance, then "did not bat".
  const batters: BatterRow[] = [];
  for (const id of batOrder) {
    const p = battingMap.get(id);
    if (!p) continue;
    const s = ensureBat(id);
    batters.push({
      player: p,
      runs: s.runs,
      ballsFaced: s.ballsFaced,
      fours: s.fours,
      sixes: s.sixes,
      strikeRate: s.ballsFaced > 0 ? (s.runs / s.ballsFaced) * 100 : 0,
      outInfo: s.outInfo,
      didBat: true
    });
  }
  for (const p of battingTeamPlayers) {
    if (!seenBat.has(p.id)) {
      batters.push({
        player: p,
        runs: 0,
        ballsFaced: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        outInfo: "did not bat",
        didBat: false
      });
    }
  }

  const bowlers: BowlerRow[] = bowlOrder.map((id) => {
    const s = bowlStats.get(id)!;
    const p =
      bowlingMap.get(id) ??
      ({
        id,
        name: "Unknown",
        role: "BOWLER",
        isCaptain: false
      } as ScorecardPlayer);
    let maidens = 0;
    for (const [, runs] of s.perOverRuns) {
      // Only count completed overs that the bowler bowled and conceded 0 in.
      // We approximate "completed" with 6 legal balls in that over for THIS bowler.
      // Quick approximation: total legal balls / 6 maidens ratio is unreliable; we
      // just count overs where the bowler conceded 0 runs at all.
      if (runs === 0) maidens += 1;
    }
    const overs = s.legalBalls / 6;
    const economy = overs > 0 ? s.runsConceded / overs : 0;
    return {
      player: p,
      legalBalls: s.legalBalls,
      oversText: formatOversText(s.legalBalls),
      runsConceded: s.runsConceded,
      wickets: s.wickets,
      maidens,
      economy,
      noBalls: s.noBalls,
      wides: s.wides
    };
  });

  return {
    battingTeamId,
    bowlingTeamId,
    batters,
    bowlers,
    extras
  };
}

// ---------- MVP / per-player match points ----------

export type MatchPlayerPoints = {
  player: ScorecardPlayer;
  teamId: string | null;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  wickets: number;
  legalBallsBowled: number;
  runsConceded: number;
  catches: number;
  runOuts: number;
  stumpings: number;
  points: number;
  // True iff the player either batted, bowled or took a fielding dismissal.
  participated: boolean;
};

export function computeMatchPoints(
  balls: ScorecardBall[],
  players: ScorecardPlayer[],
  teamIdByPlayerId: Map<string, string>
): MatchPlayerPoints[] {
  const playerById = new Map(players.map((p) => [p.id, p]));
  const stats = new Map<
    string,
    {
      runs: number;
      ballsFaced: number;
      fours: number;
      sixes: number;
      wickets: number;
      legalBallsBowled: number;
      runsConceded: number;
      catches: number;
      runOuts: number;
      stumpings: number;
      participated: boolean;
    }
  >();
  const ensure = (id: string) => {
    let s = stats.get(id);
    if (!s) {
      s = {
        runs: 0,
        ballsFaced: 0,
        fours: 0,
        sixes: 0,
        wickets: 0,
        legalBallsBowled: 0,
        runsConceded: 0,
        catches: 0,
        runOuts: 0,
        stumpings: 0,
        participated: false
      };
      stats.set(id, s);
    }
    return s;
  };

  for (const b of balls) {
    const bat = ensure(b.strikerId);
    bat.participated = true;
    const off = offBatRuns(b);
    bat.runs += off;
    if (b.legal) bat.ballsFaced += 1;
    if (off === 4) bat.fours += 1;
    if (off === 6) bat.sixes += 1;

    const bowl = ensure(b.bowlerId);
    bowl.participated = true;
    if (b.legal) bowl.legalBallsBowled += 1;
    bowl.runsConceded += bowlerConcededRuns(b);
    if (b.isWicket && b.wicketType && b.wicketType !== "RUN_OUT") {
      bowl.wickets += 1;
    }

    if (b.isWicket && b.fielderId && b.wicketType) {
      const f = ensure(b.fielderId);
      f.participated = true;
      if (b.wicketType === "CAUGHT") f.catches += 1;
      else if (b.wicketType === "RUN_OUT") f.runOuts += 1;
      else if (b.wicketType === "STUMPED") f.stumpings += 1;
    }
  }

  const rows: MatchPlayerPoints[] = [];
  for (const p of players) {
    const s = stats.get(p.id);
    const runs = s?.runs ?? 0;
    const wickets = s?.wickets ?? 0;
    const catches = s?.catches ?? 0;
    const runOuts = s?.runOuts ?? 0;
    const stumpings = s?.stumpings ?? 0;
    const fours = s?.fours ?? 0;
    const sixes = s?.sixes ?? 0;
    // Same scoring formula as the global player ranking so they're consistent:
    //   runs + 25*wickets + 8*fielding + 1*4s + 2*6s
    const points =
      runs + wickets * 25 + (catches + runOuts + stumpings) * 8 + fours + sixes * 2;
    rows.push({
      player: playerById.get(p.id) ?? p,
      teamId: teamIdByPlayerId.get(p.id) ?? null,
      runs,
      ballsFaced: s?.ballsFaced ?? 0,
      fours,
      sixes,
      wickets,
      legalBallsBowled: s?.legalBallsBowled ?? 0,
      runsConceded: s?.runsConceded ?? 0,
      catches,
      runOuts,
      stumpings,
      points,
      participated: s?.participated ?? false
    });
  }

  rows.sort((a, b) => b.points - a.points || b.runs - a.runs || b.wickets - a.wickets);
  return rows;
}
