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
//
// We use a Dream11 T20-style fantasy scoring system, but scaled to the
// length of the match. In a 20-over T20 a wicket is +25; in a 6-over
// match wickets are scarce and short knocks are decisive, so the same
// +25 would dominate everything. Three presets cover the common formats:
//
//   • ≤ 8 overs  — "very short" (typical scratch / 6-over games)
//   • 9–12 overs — "short"      (T10-ish)
//   • ≥ 13 overs — "T20"        (standard Dream11 values)
//
// Milestone thresholds also shrink in shorter formats so a 15-run knock
// can earn the first milestone bonus in a 6-over match.

export type PointsConfig = {
  bat: {
    perRun: number;
    per4Bonus: number;
    per6Bonus: number;
    milestones: Array<{ atRuns: number; bonus: number }>; // applied as highest reached
    duckPenalty: number;
  };
  bowl: {
    perWicket: number;
    perBowledOrLBW: number;
    hauls: Array<{ atWickets: number; bonus: number }>; // applied as highest reached
    perMaiden: number;
    economyMinOvers: number;
    economyBands: Array<{ max: number; points: number }>;
  };
  field: {
    perCatch: number;
    threeCatchBonus: number;
    perStumping: number;
    perRunOut: number;
  };
  matchOvers: number;
  formatLabel: "very-short" | "short" | "t20";
};

// Default economy bands — broadly format-agnostic since per-over scoring
// rates don't vary as much as raw point totals do.
const ECONOMY_BANDS = [
  { max: 5, points: 6 },
  { max: 6, points: 4 },
  { max: 7, points: 2 },
  { max: 10, points: 0 },
  { max: 11, points: -2 },
  { max: 12, points: -4 },
  { max: Infinity, points: -6 }
] as const;

export function pointsConfig(matchOvers: number): PointsConfig {
  if (matchOvers <= 8) {
    // Very short (≤ 8 overs): wickets are sparse, scores low, every catch
    // really matters but is worth less in absolute terms than in T20.
    return {
      bat: {
        perRun: 1,
        per4Bonus: 1,
        per6Bonus: 2,
        milestones: [
          { atRuns: 15, bonus: 4 },
          { atRuns: 25, bonus: 8 },
          { atRuns: 40, bonus: 16 }
        ],
        duckPenalty: -1
      },
      bowl: {
        perWicket: 10,
        perBowledOrLBW: 3,
        hauls: [
          { atWickets: 2, bonus: 4 },
          { atWickets: 3, bonus: 8 },
          { atWickets: 4, bonus: 16 }
        ],
        perMaiden: 5,
        economyMinOvers: 1,
        economyBands: [...ECONOMY_BANDS]
      },
      field: {
        perCatch: 3,
        threeCatchBonus: 4,
        perStumping: 5,
        perRunOut: 5
      },
      matchOvers,
      formatLabel: "very-short"
    };
  }

  if (matchOvers <= 12) {
    // Short formats (T10-ish): mid-way between very-short and T20.
    return {
      bat: {
        perRun: 1,
        per4Bonus: 1,
        per6Bonus: 2,
        milestones: [
          { atRuns: 20, bonus: 4 },
          { atRuns: 35, bonus: 8 },
          { atRuns: 60, bonus: 16 }
        ],
        duckPenalty: -2
      },
      bowl: {
        perWicket: 15,
        perBowledOrLBW: 5,
        hauls: [
          { atWickets: 2, bonus: 4 },
          { atWickets: 3, bonus: 8 },
          { atWickets: 4, bonus: 16 }
        ],
        perMaiden: 8,
        economyMinOvers: 1,
        economyBands: [...ECONOMY_BANDS]
      },
      field: {
        perCatch: 5,
        threeCatchBonus: 4,
        perStumping: 8,
        perRunOut: 8
      },
      matchOvers,
      formatLabel: "short"
    };
  }

  // 13+ overs → classic T20 Dream11 values.
  return {
    bat: {
      perRun: 1,
      per4Bonus: 1,
      per6Bonus: 2,
      milestones: [
        { atRuns: 30, bonus: 4 },
        { atRuns: 50, bonus: 8 },
        { atRuns: 100, bonus: 16 }
      ],
      duckPenalty: -2
    },
    bowl: {
      perWicket: 25,
      perBowledOrLBW: 8,
      hauls: [
        { atWickets: 3, bonus: 4 },
        { atWickets: 4, bonus: 8 },
        { atWickets: 5, bonus: 16 }
      ],
      perMaiden: 12,
      economyMinOvers: 2,
      economyBands: [...ECONOMY_BANDS]
    },
    field: {
      perCatch: 8,
      threeCatchBonus: 4,
      perStumping: 12,
      perRunOut: 12
    },
    matchOvers,
    formatLabel: "t20"
  };
}

// Back-compat default kept for any callers that haven't migrated yet.
export const POINTS = pointsConfig(20);

export type MatchPointsBreakdown = {
  batting: number;
  bowling: number;
  fielding: number;
};

export type MatchPlayerPoints = {
  player: ScorecardPlayer;
  teamId: string | null;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  wickets: number;
  bowledOrLbw: number;
  maidens: number;
  legalBallsBowled: number;
  runsConceded: number;
  catches: number;
  runOuts: number;
  stumpings: number;
  isDuck: boolean;
  points: number;
  breakdown: MatchPointsBreakdown;
  participated: boolean;
};

function economyPoints(
  runsConceded: number,
  legalBalls: number,
  cfg: PointsConfig
): number {
  const overs = legalBalls / 6;
  if (overs < cfg.bowl.economyMinOvers) return 0;
  const econ = overs > 0 ? runsConceded / overs : 0;
  for (const band of cfg.bowl.economyBands) {
    if (econ < band.max) return band.points;
  }
  return 0;
}

function milestonePoints(
  runs: number,
  ballsFaced: number,
  cfg: PointsConfig
): number {
  // Milestones only apply if the batter actually faced a ball. Pick the
  // highest milestone reached (they don't stack).
  if (ballsFaced === 0) return 0;
  let bonus = 0;
  for (const m of cfg.bat.milestones) {
    if (runs >= m.atRuns) bonus = m.bonus;
  }
  return bonus;
}

function haulPoints(wickets: number, cfg: PointsConfig): number {
  // Pick the highest haul tier reached (no stacking).
  let bonus = 0;
  for (const h of cfg.bowl.hauls) {
    if (wickets >= h.atWickets) bonus = h.bonus;
  }
  return bonus;
}

export function computeMatchPoints(
  balls: ScorecardBall[],
  players: ScorecardPlayer[],
  teamIdByPlayerId: Map<string, string>,
  cfg: PointsConfig = pointsConfig(20)
): MatchPlayerPoints[] {
  const playerById = new Map(players.map((p) => [p.id, p]));
  type Acc = {
    runs: number;
    ballsFaced: number;
    fours: number;
    sixes: number;
    wickets: number;
    bowledOrLbw: number;
    legalBallsBowled: number;
    runsConceded: number;
    // Per-(inningsKey, over) runs conceded by this bowler — used for maidens.
    perOverConceded: Map<string, number>;
    catches: number;
    runOuts: number;
    stumpings: number;
    wasDismissed: boolean;
    participated: boolean;
  };
  const stats = new Map<string, Acc>();
  const ensure = (id: string): Acc => {
    let s = stats.get(id);
    if (!s) {
      s = {
        runs: 0,
        ballsFaced: 0,
        fours: 0,
        sixes: 0,
        wickets: 0,
        bowledOrLbw: 0,
        legalBallsBowled: 0,
        runsConceded: 0,
        perOverConceded: new Map(),
        catches: 0,
        runOuts: 0,
        stumpings: 0,
        wasDismissed: false,
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
    if (b.isWicket) {
      const outId = b.outBatterId ?? b.strikerId;
      const outBat = ensure(outId);
      outBat.wasDismissed = true;
    }

    const bowl = ensure(b.bowlerId);
    bowl.participated = true;
    if (b.legal) bowl.legalBallsBowled += 1;
    const conc = bowlerConcededRuns(b);
    bowl.runsConceded += conc;
    // Bucket per-over runs by overNumber. (Cross-innings is OK because the
    // same bowler can't bowl the same over number in two innings of the
    // same match for our purposes — we treat overs uniquely per (bowler,
    // overNumber) which is fine for maiden counting.)
    const overKey = `${b.overNumber}`;
    bowl.perOverConceded.set(
      overKey,
      (bowl.perOverConceded.get(overKey) ?? 0) + conc
    );
    if (b.isWicket && b.wicketType && b.wicketType !== "RUN_OUT") {
      bowl.wickets += 1;
      if (b.wicketType === "BOWLED" || b.wicketType === "LBW") {
        bowl.bowledOrLbw += 1;
      }
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
    const ballsFaced = s?.ballsFaced ?? 0;
    const fours = s?.fours ?? 0;
    const sixes = s?.sixes ?? 0;
    const wickets = s?.wickets ?? 0;
    const bowledOrLbw = s?.bowledOrLbw ?? 0;
    const legalBallsBowled = s?.legalBallsBowled ?? 0;
    const runsConceded = s?.runsConceded ?? 0;
    const catches = s?.catches ?? 0;
    const runOuts = s?.runOuts ?? 0;
    const stumpings = s?.stumpings ?? 0;
    const wasDismissed = s?.wasDismissed ?? false;
    const isDuck = wasDismissed && runs === 0;

    // Maidens: count overs where this bowler conceded 0 runs AND bowled
    // at least 6 legal balls in that over (i.e. completed it). We don't
    // track legal balls per over per bowler precisely — approximate by
    // counting any 0-run over and capping at total overs bowled.
    let maidens = 0;
    if (s) {
      for (const [, runsInOver] of s.perOverConceded) {
        if (runsInOver === 0) maidens += 1;
      }
      const completedOvers = Math.floor(legalBallsBowled / 6);
      if (maidens > completedOvers) maidens = completedOvers;
    }

    // Batting points
    let batPts =
      runs * cfg.bat.perRun +
      fours * cfg.bat.per4Bonus +
      sixes * cfg.bat.per6Bonus +
      milestonePoints(runs, ballsFaced, cfg);
    if (isDuck) batPts += cfg.bat.duckPenalty;

    // Bowling points
    let bowlPts = wickets * cfg.bowl.perWicket;
    bowlPts += bowledOrLbw * cfg.bowl.perBowledOrLBW;
    bowlPts += haulPoints(wickets, cfg);
    bowlPts += maidens * cfg.bowl.perMaiden;
    bowlPts += economyPoints(runsConceded, legalBallsBowled, cfg);

    // Fielding points
    let fieldPts =
      catches * cfg.field.perCatch +
      stumpings * cfg.field.perStumping +
      runOuts * cfg.field.perRunOut;
    if (catches >= 3) fieldPts += cfg.field.threeCatchBonus;

    const points = batPts + bowlPts + fieldPts;

    rows.push({
      player: playerById.get(p.id) ?? p,
      teamId: teamIdByPlayerId.get(p.id) ?? null,
      runs,
      ballsFaced,
      fours,
      sixes,
      wickets,
      bowledOrLbw,
      maidens,
      legalBallsBowled,
      runsConceded,
      catches,
      runOuts,
      stumpings,
      isDuck,
      points,
      breakdown: { batting: batPts, bowling: bowlPts, fielding: fieldPts },
      participated: s?.participated ?? false
    });
  }

  rows.sort(
    (a, b) =>
      b.points - a.points ||
      b.runs - a.runs ||
      b.wickets - a.wickets ||
      a.player.name.localeCompare(b.player.name)
  );
  return rows;
}

// ---------- Series / Tournament-level leaderboard ----------
//
// Aggregates per-match points across an entire tournament so an organizer
// can crown a "Player of the Series". Each match's points are computed in
// isolation with its own format-appropriate config (so e.g. a 6-over
// fixture and a 20-over fixture in the same tournament both contribute
// fairly).

export type SeriesPlayerRow = {
  player: ScorecardPlayer;
  teamId: string | null;
  matchesPlayed: number;
  totalPoints: number;
  runs: number;
  ballsFaced: number;
  wickets: number;
  legalBallsBowled: number;
  runsConceded: number;
  catches: number;
  runOuts: number;
  stumpings: number;
  fours: number;
  sixes: number;
};

export type SeriesMatchInput = {
  balls: ScorecardBall[];
  players: ScorecardPlayer[];
  teamIdByPlayerId: Map<string, string>;
  config: PointsConfig;
};

export function computeSeriesPoints(
  matches: SeriesMatchInput[]
): SeriesPlayerRow[] {
  // Aggregate per-match rows by player id, summing every counting stat.
  type Agg = SeriesPlayerRow;
  const byPlayer = new Map<string, Agg>();
  const ensure = (p: ScorecardPlayer, teamId: string | null): Agg => {
    let row = byPlayer.get(p.id);
    if (!row) {
      row = {
        player: p,
        teamId,
        matchesPlayed: 0,
        totalPoints: 0,
        runs: 0,
        ballsFaced: 0,
        wickets: 0,
        legalBallsBowled: 0,
        runsConceded: 0,
        catches: 0,
        runOuts: 0,
        stumpings: 0,
        fours: 0,
        sixes: 0
      };
      byPlayer.set(p.id, row);
    } else if (!row.teamId && teamId) {
      // Latch the most recent known team for display.
      row.teamId = teamId;
    }
    return row;
  };

  for (const m of matches) {
    const matchRows = computeMatchPoints(
      m.balls,
      m.players,
      m.teamIdByPlayerId,
      m.config
    );
    for (const r of matchRows) {
      if (!r.participated) continue;
      const agg = ensure(r.player, r.teamId);
      agg.matchesPlayed += 1;
      agg.totalPoints += r.points;
      agg.runs += r.runs;
      agg.ballsFaced += r.ballsFaced;
      agg.wickets += r.wickets;
      agg.legalBallsBowled += r.legalBallsBowled;
      agg.runsConceded += r.runsConceded;
      agg.catches += r.catches;
      agg.runOuts += r.runOuts;
      agg.stumpings += r.stumpings;
      agg.fours += r.fours;
      agg.sixes += r.sixes;
    }
  }

  return Array.from(byPlayer.values()).sort(
    (a, b) =>
      b.totalPoints - a.totalPoints ||
      b.runs - a.runs ||
      b.wickets - a.wickets ||
      a.player.name.localeCompare(b.player.name)
  );
}
