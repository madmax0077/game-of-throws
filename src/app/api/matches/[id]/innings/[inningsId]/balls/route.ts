import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  // Super over: team total is doubled, but Ball.runs stays raw so individual
  // batter/bowler stats remain accurate.
  const teamScoreMultiplier = innings.isSuperOver ? 2 : 1;
  const rawRuns = data.runs + (data.extraRuns ?? 0);
  const totalAddedRuns = rawRuns * teamScoreMultiplier;
  const wicketIncrement = data.isWicket ? 1 : 0;
  const ballIncrement = data.legal ? 1 : 0;

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
        commentary: data.commentary ?? null
      }
    }),
    prisma.innings.update({
      where: { id: innings.id },
      data: {
        totalRuns: { increment: totalAddedRuns },
        totalWickets: { increment: wicketIncrement },
        totalBalls: { increment: ballIncrement }
      }
    })
  ]);

  // Super Over auto-disable: the flag is a "this over only" multiplier.
  // The moment a full over completes, switch it back off so the next over
  // is a normal over again. Scorer can re-enable it at the start of the
  // next over from the scoring board if needed.
  const overJustEnded =
    data.legal &&
    updatedInnings.totalBalls > 0 &&
    updatedInnings.totalBalls % 6 === 0;
  if (overJustEnded && innings.isSuperOver) {
    await prisma.innings.update({
      where: { id: innings.id },
      data: { isSuperOver: false }
    });
  }

  // For a 2nd innings we also need to know the first-innings total so the
  // chase can be closed the instant the target is overhauled.
  let firstInningsRuns: number | null = null;
  if (innings.number === 2) {
    const first = await prisma.innings.findFirst({
      where: { matchId: innings.match.id, number: 1 },
      select: { totalRuns: true }
    });
    firstInningsRuns = first?.totalRuns ?? null;
  }

  // Closure rules:
  //   1) All overs bowled (totalBalls >= match.overs * 6)
  //   2) All out — need at least 2 batters left, so wickets >= players - 1
  //   3) Target reached — chasing side (innings 2) has overtaken the
  //      first-innings total. Match is decided, no point bowling the
  //      remaining overs.
  const overLimitReached = updatedInnings.totalBalls >= innings.match.overs * 6;
  const allOut =
    battingTeamPlayerCount >= 2 &&
    updatedInnings.totalWickets >= battingTeamPlayerCount - 1;
  const targetReached =
    firstInningsRuns !== null && updatedInnings.totalRuns > firstInningsRuns;

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
    // Target reached trumps the other reasons — a winning hit on the last
    // legal ball of the over is still a chase-win, not an "overs completed".
    closureReason = targetReached
      ? "TARGET_REACHED"
      : overLimitReached
      ? "OVERS_COMPLETED"
      : "ALL_OUT";

    // Match-completion check: both teams must have at least one CLOSED innings.
    // (The innings we just closed is included via the OR clause below.)
    const closedInnings = await prisma.innings.findMany({
      where: { matchId: innings.match.id, isClosed: true },
      select: { battingTeamId: true, totalRuns: true }
    });
    const homeClosed = closedInnings.some(
      (i) => i.battingTeamId === innings.match.homeTeamId
    );
    const awayClosed = closedInnings.some(
      (i) => i.battingTeamId === innings.match.awayTeamId
    );

    if (homeClosed && awayClosed && innings.match.status !== "COMPLETED") {
      // Compute a simple result string. Multi-innings totals are summed in case
      // a team somehow has more than one closed innings (future-proofing).
      const homeTotal = closedInnings
        .filter((i) => i.battingTeamId === innings.match.homeTeamId)
        .reduce((s, i) => s + i.totalRuns, 0);
      const awayTotal = closedInnings
        .filter((i) => i.battingTeamId === innings.match.awayTeamId)
        .reduce((s, i) => s + i.totalRuns, 0);

      // Need the short names for the result text.
      const teams = await prisma.team.findMany({
        where: { id: { in: [innings.match.homeTeamId, innings.match.awayTeamId] } },
        select: { id: true, shortName: true }
      });
      const homeShort =
        teams.find((t) => t.id === innings.match.homeTeamId)?.shortName ?? "Home";
      const awayShort =
        teams.find((t) => t.id === innings.match.awayTeamId)?.shortName ?? "Away";

      let resultText: string;
      if (targetReached) {
        // Chasing team (current innings' batting team) won. Conventional
        // cricket: "X won by N wickets" where N = wickets in hand.
        const wicketsInHand =
          battingTeamPlayerCount >= 2
            ? Math.max(0, battingTeamPlayerCount - 1 - updatedInnings.totalWickets)
            : 0;
        const chasingShort =
          innings.battingTeamId === innings.match.homeTeamId
            ? homeShort
            : awayShort;
        resultText = `${chasingShort} won by ${wicketsInHand} wicket${
          wicketsInHand === 1 ? "" : "s"
        }`;
      } else if (homeTotal > awayTotal) {
        const diff = homeTotal - awayTotal;
        resultText = `${homeShort} won by ${diff} run${diff === 1 ? "" : "s"}`;
      } else if (awayTotal > homeTotal) {
        const diff = awayTotal - homeTotal;
        resultText = `${awayShort} won by ${diff} run${diff === 1 ? "" : "s"}`;
      } else {
        resultText = "Match tied";
      }

      await prisma.match.update({
        where: { id: innings.match.id },
        data: { status: "COMPLETED", resultText }
      });
      matchCompleted = true;
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
