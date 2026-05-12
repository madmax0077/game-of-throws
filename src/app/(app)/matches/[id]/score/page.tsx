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
  const dismissalsByInnings: Record<string, string[]> = {};
  const previousOverBowlerByInnings: Record<string, string | null> = {};

  for (const inn of match.innings) {
    const [dismissals, lastLegalBall] = await Promise.all([
      prisma.ball.findMany({
        where: { inningsId: inn.id, isWicket: true, outBatterId: { not: null } },
        select: { outBatterId: true }
      }),
      prisma.ball.findFirst({
        where: { inningsId: inn.id, legal: true },
        orderBy: { createdAt: "desc" },
        select: { bowlerId: true }
      })
    ]);
    dismissalsByInnings[inn.id] = dismissals
      .map((d) => d.outBatterId)
      .filter((x): x is string => Boolean(x));
    previousOverBowlerByInnings[inn.id] = lastLegalBall?.bowlerId ?? null;
  }

  return (
    <ScoreEntry
      match={{
        id: match.id,
        overs: match.overs,
        status: match.status,
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
          dismissedBatterIds: dismissalsByInnings[inn.id] ?? [],
          previousOverBowlerId: previousOverBowlerByInnings[inn.id] ?? null,
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
