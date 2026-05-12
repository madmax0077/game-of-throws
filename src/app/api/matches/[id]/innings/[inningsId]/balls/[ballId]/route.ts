import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const innings = await prisma.innings.findUnique({
    where: { id: ball.inningsId },
    select: { isSuperOver: true }
  });
  const multiplier = innings?.isSuperOver ? 2 : 1;
  const totalRevertedRuns = (ball.runs + (ball.extraRuns ?? 0)) * multiplier;
  const wicketDec = ball.isWicket ? 1 : 0;
  const ballDec = ball.legal ? 1 : 0;

  await prisma.$transaction([
    prisma.ball.delete({ where: { id: ball.id } }),
    prisma.innings.update({
      where: { id: ball.inningsId },
      data: {
        totalRuns: { decrement: totalRevertedRuns },
        totalWickets: { decrement: wicketDec },
        totalBalls: { decrement: ballDec }
      }
    })
  ]);

  return NextResponse.json({ ok: true });
}
