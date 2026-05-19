import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ScoreEntry } from "@/components/ScoreEntry";

export const dynamic = "force-dynamic";

export default async function ScorePage({
  params
}: {
  params: { id: string };
}) {
  const match = await prisma.match.findUnique({
    where: { id: params.id },
    include: {
      homeTeam: { include: { players: { orderBy: { name: "asc" } } } },
      awayTeam: { include: { players: { orderBy: { name: "asc" } } } },
      tournament: true,
      innings: {
        include: {
          balls: { orderBy: { createdAt: "desc" }, take: 12 }
        },
        orderBy: { number: "asc" }
      }
    }
  });
  if (!match) notFound();

  // For each innings, derive:
  //   - dismissedBatterIds (so new-batter picker can exclude them)
  //   - previousOverBowlerId (bowler of the most recent legal ball, used to
  //     block re-selection at over boundaries)
  //   - bowlerOversCount  (distinct overs each bowler has bowled in this
  //     innings — used to enforce the per-bowler over cap in the picker)
  const dismissalsByInnings: Record<string, string[]> = {};
  const previousOverBowlerByInnings: Record<string, string | null> = {};
  const bowlerOversByInnings: Record<string, Record<string, number>> = {};

  for (const inn of match.innings) {
    const [dismissals, lastLegalBall, bowlerOvers] = await Promise.all([
      prisma.ball.findMany({
        where: { inningsId: inn.id, isWicket: true, outBatterId: { not: null } },
        select: { outBatterId: true }
      }),
      prisma.ball.findFirst({
        where: { inningsId: inn.id, legal: true },
        orderBy: { createdAt: "desc" },
        select: { bowlerId: true }
      }),
      prisma.ball.findMany({
        where: { inningsId: inn.id, legal: true },
        select: { bowlerId: true, overNumber: true },
        distinct: ["bowlerId", "overNumber"]
      })
    ]);
    dismissalsByInnings[inn.id] = dismissals
      .map((d) => d.outBatterId)
      .filter((x): x is string => Boolean(x));
    previousOverBowlerByInnings[inn.id] = lastLegalBall?.bowlerId ?? null;
    const overCount: Record<string, number> = {};
    for (const row of bowlerOvers) {
      overCount[row.bowlerId] = (overCount[row.bowlerId] ?? 0) + 1;
    }
    bowlerOversByInnings[inn.id] = overCount;
  }

  return (
    <ScoreEntry
      match={{
        id: match.id,
        overs: match.overs,
        status: match.status,
        resultText: match.resultText,
        homeTeam: {
          id: match.homeTeam.id,
          shortName: match.homeTeam.shortName,
          name: match.homeTeam.name,
          players: match.homeTeam.players.map((p) => ({ id: p.id, name: p.name }))
        },
        awayTeam: {
          id: match.awayTeam.id,
          shortName: match.awayTeam.shortName,
          name: match.awayTeam.name,
          players: match.awayTeam.players.map((p) => ({ id: p.id, name: p.name }))
        },
        innings: match.innings.map((inn) => ({
          id: inn.id,
          number: inn.number,
          battingTeamId: inn.battingTeamId,
          bowlingTeamId: inn.bowlingTeamId,
          totalRuns: inn.totalRuns,
          totalWickets: inn.totalWickets,
          totalBalls: inn.totalBalls,
          isClosed: inn.isClosed,
          isSuperOver: inn.isSuperOver,
          superOverOneActive: inn.superOverOneActive,
          dismissedBatterIds: dismissalsByInnings[inn.id] ?? [],
          previousOverBowlerId: previousOverBowlerByInnings[inn.id] ?? null,
          bowlerOversCount: bowlerOversByInnings[inn.id] ?? {},
          recentBalls: inn.balls.map((b) => ({
            id: b.id,
            runs: b.runs,
            extraType: b.extraType,
            extraRuns: b.extraRuns,
            isWicket: b.isWicket,
            legal: b.legal
          }))
        }))
      }}
    />
  );
}
