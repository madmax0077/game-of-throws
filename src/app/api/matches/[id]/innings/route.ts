import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CreateSchema = z.object({
  number: z.number().int().min(1).max(20),
  battingTeamId: z.string(),
  bowlingTeamId: z.string(),
  isSuperOver: z.boolean().optional().default(false)
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const match = await prisma.match.findUnique({
    where: { id: params.id },
    include: { innings: true }
  });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  // Each team can bat only once per match. Reject if the requested batting team
  // already has any innings (open or closed) in this match.
  const alreadyBatted = match.innings.some(
    (i) => i.battingTeamId === parsed.data.battingTeamId
  );
  if (alreadyBatted) {
    return NextResponse.json(
      {
        error:
          "This team has already batted in this match. Only the other team can bat next."
      },
      { status: 409 }
    );
  }

  // Sanity: batting & bowling teams must differ and must belong to this match.
  if (parsed.data.battingTeamId === parsed.data.bowlingTeamId) {
    return NextResponse.json(
      { error: "Batting and bowling teams must be different." },
      { status: 400 }
    );
  }
  const validTeamIds = new Set([match.homeTeamId, match.awayTeamId]);
  if (
    !validTeamIds.has(parsed.data.battingTeamId) ||
    !validTeamIds.has(parsed.data.bowlingTeamId)
  ) {
    return NextResponse.json(
      { error: "Teams must be part of this match." },
      { status: 400 }
    );
  }

  const innings = await prisma.innings.create({
    data: {
      matchId: params.id,
      number: parsed.data.number,
      battingTeamId: parsed.data.battingTeamId,
      bowlingTeamId: parsed.data.bowlingTeamId,
      isSuperOver: parsed.data.isSuperOver
    }
  });

  if (match.status === "SCHEDULED") {
    await prisma.match.update({
      where: { id: params.id },
      data: { status: "LIVE" }
    });
  }

  return NextResponse.json(innings, { status: 201 });
}
