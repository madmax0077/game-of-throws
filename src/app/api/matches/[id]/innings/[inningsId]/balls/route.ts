import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ballTeamRunsMultiplier,
  inningsOverLimitBalls,
  isAllOut,
  isDedicatedSuperOverInnings
} from "@/lib/inningsRules";

// Wicket types that require a fielder to be credited:
//   CAUGHT   → catcher
//   RUN_OUT  → fielder who broke the stumps
//   STUMPED  → wicket-keeper
const FIELDER_WICKETS = new Set(["CAUGHT", "RUN_OUT", "STUMPED"]);

const CreateSchema = z
  .object({
    strikerId: z.string(),
    nonStrikerId: z.string(),
    bowlerId: z.string(),
    runs: z.number().int().min(0).max(7),
    extraType: z.enum(["WIDE", "NO_BALL", "BYE", "LEG_BYE", "PENALTY"]).nullable().optional(),
    extraRuns: z.number().int().min(0).max(7).default(0),
    isWicket: z.boolean().default(false),
    wicketType: z
      .enum(["BOWLED", "CAUGHT", "LBW", "RUN_OUT", "STUMPED", "HIT_WICKET"])
      .nullable()
      .optional(),
    outBatterId: z.string().nullable().optional(),
    fielderId: z.string().nullable().optional(),
    commentary: z.string().nullable().optional(),
    legal: z.boolean().default(true)
  })
  .refine(
    (d) => !(d.isWicket && d.wicketType && FIELDER_WICKETS.has(d.wicketType) && !d.fielderId),
    {
      message: "fielderId is required for CAUGHT, RUN_OUT and STUMPED wickets.",
      path: ["fielderId"]
    }
  );

export async function POST(
  req: Request,
  { params }: { params: { id: string; inningsId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const innings = await prisma.innings.findUnique({
    where: { id: params.inningsId },
    include: { match: true }
  });
  if (!innings) return NextResponse.json({ error: "Innings not found" }, { status: 404 });
  if (innings.isClosed)
    return NextResponse.json({ error: "Innings closed" }, { status: 400 });

  const legalBallsBefore = innings.totalBalls;
  const overNumber = Math.floor(legalBallsBefore / 6);
  const ballInOver = (legalBallsBefore % 6) + 1;

  // Bowler quota: in regular innings a bowler may bowl at most 2 overs
  // per match. Dedicated super-over legs have no per-bowler cap.
  if (!isDedicatedSuperOverInnings(innings)) {
    const overStartersForBowler = await prisma.ball.findMany({
      where: { inningsId: innings.id, bowlerId: data.bowlerId, legal: true },
      select: { overNumber: true },
      distinct: ["overNumber"]
    });
    const oversAlreadyStarted = overStartersForBowler.map((b) => b.overNumber);
    const startingNewOver = !oversAlreadyStarted.includes(overNumber);
    const MAX_OVERS_PER_BOWLER = 2;
    if (startingNewOver && oversAlreadyStarted.length >= MAX_OVERS_PER_BOWLER) {
      return NextResponse.json(
        {
          error: `This bowler has already bowled ${MAX_OVERS_PER_BOWLER} overs in this match. Pick a different bowler.`
        },
        { status: 400 }
      );
    }
  }

  const scoreMultiplier = ballTeamRunsMultiplier(innings);
  const rawRuns = data.runs + (data.extraRuns ?? 0);
  const totalAddedRuns = rawRuns * scoreMultiplier;
  const wicketIncrement = data.isWicket ? 1 : 0;
  const ballIncrement = data.legal ? 1 : 0;
  const overEndsAfterThisBall =
    data.legal && ballIncrement > 0 && (legalBallsBefore + ballIncrement) % 6 === 0;

  // Need the batting team's player count to know when "all out" triggers.
  const battingTeamPlayerCount = await prisma.player.count({
    where: { teamId: innings.battingTeamId }
  });

  const [ball, updatedInnings] = await prisma.$transaction([
    prisma.ball.create({
      data: {
        inningsId: innings.id,
        overNumber,
        ballInOver,
        legal: data.legal,
        runs: data.runs,
        extraType: data.extraType ?? null,
        extraRuns: data.extraRuns ?? 0,
        isWicket: data.isWicket,
        wicketType: data.wicketType ?? null,
        strikerId: data.strikerId,
        nonStrikerId: data.nonStrikerId,
        bowlerId: data.bowlerId,
        outBatterId: data.outBatterId ?? null,
        fielderId: data.fielderId ?? null,
        commentary: data.commentary ?? null,
        teamRunsMultiplier: scoreMultiplier
      }
    }),
    prisma.innings.update({
      where: { id: innings.id },
      data: {
        totalRuns: { increment: totalAddedRuns },
        totalWickets: { increment: wicketIncrement },
        totalBalls: { increment: ballIncrement },
        ...(overEndsAfterThisBall && innings.superOverOneActive
          ? { superOverOneActive: false }
          : {})
      }
    })
  ]);

  // What total does the current innings need to overhaul to "reach the
  // target"? For a regular 2nd innings it's the regular 1st innings total.
  // For a super-over CHASE leg it's the preceding super-over leg, which we
  // identify purely by number (the leg at innings.number - 1). We avoid
  // filtering by isSuperOver here because an older bug could have flipped
  // that flag off on the preceding leg.
  let targetRuns: number | null = null;
  if (!isDedicatedSuperOverInnings(innings) && innings.number === 2) {
    const first = await prisma.innings.findFirst({
      where: { matchId: innings.match.id, number: 1 },
      select: { totalRuns: true }
    });
    targetRuns = first?.totalRuns ?? null;
  } else if (isDedicatedSuperOverInnings(innings) && innings.number >= 4) {
    // Super-over legs are always scheduled back-to-back, so the immediate
    // predecessor (number - 1) is the leg we're chasing.
    const earlierLeg = await prisma.innings.findFirst({
      where: {
        matchId: innings.match.id,
        number: innings.number - 1,
        isClosed: true
      },
      select: { totalRuns: true }
    });
    targetRuns = earlierLeg?.totalRuns ?? null;
  }

  // Closure rules:
  //   1) All overs bowled — dedicated super-over legs: 6 legal balls only.
  //   2) All out — regular: wickets >= squad size - 1; super over: max 2 wickets.
  //   3) Target reached — chase innings overhauled the target total.
  const overLimitBalls = inningsOverLimitBalls(innings, innings.match.overs);
  const overLimitReached = updatedInnings.totalBalls >= overLimitBalls;
  const allOut = isAllOut(
    updatedInnings.totalWickets,
    battingTeamPlayerCount,
    innings
  );
  const targetReached =
    targetRuns !== null && updatedInnings.totalRuns > targetRuns;

  let closed = false;
  let closureReason:
    | "OVERS_COMPLETED"
    | "ALL_OUT"
    | "TARGET_REACHED"
    | null = null;
  let matchCompleted = false;
  if (overLimitReached || allOut || targetReached) {
    await prisma.innings.update({
      where: { id: innings.id },
      data: { isClosed: true }
    });
    closed = true;
    closureReason = targetReached
      ? "TARGET_REACHED"
      : overLimitReached
      ? "OVERS_COMPLETED"
      : "ALL_OUT";

    // Decide whether the MATCH is now complete. The rule is:
    //   - Both teams must have batted at least once (regular innings).
    //   - If regular totals are equal AND no super-over has been played
    //     yet, we DO NOT complete the match — a super over is required.
    //   - If a super over has been played and both super-over innings are
    //     closed, the team with the higher super-over total wins. If the
    //     super-over totals are also equal, another super over is needed
    //     (so we leave the match LIVE).
    const closedInnings = await prisma.innings.findMany({
      where: { matchId: innings.match.id, isClosed: true },
      orderBy: { number: "asc" },
      select: {
        battingTeamId: true,
        totalRuns: true,
        totalWickets: true,
        isSuperOver: true,
        number: true
      }
    });
    // Identify regular innings (numbers 1 & 2) vs super-over legs (>= 3)
    // by NUMBER, not by the isSuperOver flag — older buggy data may have
    // the flag wrongly cleared on a super-over leg.
    const regular = closedInnings.filter((i) => i.number <= 2);
    const superOvers = closedInnings.filter((i) => i.number >= 3);
    const regularHome = regular.find(
      (i) => i.battingTeamId === innings.match.homeTeamId
    );
    const regularAway = regular.find(
      (i) => i.battingTeamId === innings.match.awayTeamId
    );

    const teams = await prisma.team.findMany({
      where: { id: { in: [innings.match.homeTeamId, innings.match.awayTeamId] } },
      select: { id: true, shortName: true }
    });
    const homeShort =
      teams.find((t) => t.id === innings.match.homeTeamId)?.shortName ?? "Home";
    const awayShort =
      teams.find((t) => t.id === innings.match.awayTeamId)?.shortName ?? "Away";
    const shortFor = (teamId: string) =>
      teamId === innings.match.homeTeamId ? homeShort : awayShort;

    if (regularHome && regularAway && innings.match.status !== "COMPLETED") {
      const homeReg = regularHome.totalRuns;
      const awayReg = regularAway.totalRuns;

      let resultText: string | null = null;

      if (innings.number <= 2) {
        // Closure happened in a regular innings (numbers 1 or 2).
        if (targetReached) {
          // Chase win.
          const wicketsInHand =
            battingTeamPlayerCount >= 2
              ? Math.max(0, battingTeamPlayerCount - 1 - updatedInnings.totalWickets)
              : 0;
          const chasingShort = shortFor(innings.battingTeamId);
          resultText = `${chasingShort} won by ${wicketsInHand} wicket${
            wicketsInHand === 1 ? "" : "s"
          }`;
        } else if (homeReg > awayReg) {
          const diff = homeReg - awayReg;
          resultText = `${homeShort} won by ${diff} run${diff === 1 ? "" : "s"}`;
        } else if (awayReg > homeReg) {
          const diff = awayReg - homeReg;
          resultText = `${awayShort} won by ${diff} run${diff === 1 ? "" : "s"}`;
        } else {
          // TIE — leave the match LIVE so a super over can be started.
          resultText = null;
        }
      } else {
        // Closure happened in a super-over innings. We complete the match
        // ONLY when both super-over legs of the LATEST super over are done.
        // superOvers is ordered by innings number; the latest pair are the
        // last two entries IF that count is even AND both legs share the
        // same "super-over round".
        if (superOvers.length >= 2 && superOvers.length % 2 === 0) {
          const last = superOvers[superOvers.length - 1];
          const second = superOvers[superOvers.length - 2];
          if (last.totalRuns > second.totalRuns) {
            resultText = `${shortFor(last.battingTeamId)} won the super over`;
          } else if (second.totalRuns > last.totalRuns) {
            resultText = `${shortFor(second.battingTeamId)} won the super over`;
          } else {
            // Super over also tied — another one is needed; stay LIVE.
            resultText = null;
          }
        }
      }

      if (resultText) {
        await prisma.match.update({
          where: { id: innings.match.id },
          data: { status: "COMPLETED", resultText }
        });
        matchCompleted = true;
      }
    }
  }

  return NextResponse.json(
    {
      ball,
      innings: {
        totalRuns: updatedInnings.totalRuns,
        totalWickets: updatedInnings.totalWickets,
        totalBalls: updatedInnings.totalBalls,
        isClosed: closed
      },
      closed,
      closureReason,
      matchCompleted
    },
    { status: 201 }
  );
}
