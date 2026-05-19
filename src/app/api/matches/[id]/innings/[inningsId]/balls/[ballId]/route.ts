import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDedicatedSuperOverInnings } from "@/lib/inningsRules";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; inningsId: string; ballId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ball = await prisma.ball.findUnique({ where: { id: params.ballId } });
  if (!ball) return NextResponse.json({ error: "Ball not found" }, { status: 404 });
  if (ball.inningsId !== params.inningsId)
    return NextResponse.json({ error: "Mismatched innings" }, { status: 400 });

  // Delete the ball, then recompute innings totals from the remaining balls
  // using the CURRENT rule (see comment in balls/route.ts POST). This makes
  // undo self-healing: any pre-existing stale-multiplier balls don't leave
  // behind a lingering off-by-X in totalRuns.
  await prisma.ball.delete({ where: { id: ball.id } });

  const innings = await prisma.innings.findUnique({
    where: { id: ball.inningsId }
  });
  if (!innings) {
    // Innings vanished mid-flight — nothing to recompute.
    return NextResponse.json({ ok: true });
  }

  const remainingBalls = await prisma.ball.findMany({
    where: { inningsId: innings.id },
    select: {
      runs: true,
      extraRuns: true,
      isWicket: true,
      legal: true,
      teamRunsMultiplier: true
    }
  });
  const dedicatedSO = isDedicatedSuperOverInnings(innings);
  let recomputedRuns = 0;
  let recomputedWickets = 0;
  let recomputedBalls = 0;
  for (const b of remainingBalls) {
    const m = dedicatedSO ? 1 : b.teamRunsMultiplier ?? 1;
    recomputedRuns += (b.runs + (b.extraRuns ?? 0)) * m;
    if (b.legal) recomputedBalls += 1;
    if (b.isWicket) recomputedWickets += 1;
  }

  await prisma.innings.update({
    where: { id: innings.id },
    data: {
      totalRuns: recomputedRuns,
      totalWickets: recomputedWickets,
      totalBalls: recomputedBalls
    }
  });

  return NextResponse.json({ ok: true });
}
