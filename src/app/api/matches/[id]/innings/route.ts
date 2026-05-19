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

  // Each team can bat only once *per phase*. A "phase" is:
  //   - innings 1 & 2 -> "regular"   (each team bats once)
  //   - innings 3 & 4 -> super over leg 1 (each team bats once again)
  //   - innings 5 & 6 -> super over leg 2 (if leg 1 also tied), and so on.
  //
  // The earlier implementation rejected ANY repeat of a batting team across
  // the whole match, which broke the moment a super over had to start after
  // a tied regular match ("This team has already batted in this match...").
  const phaseOf = (n: number): string =>
    n <= 2 ? "regular" : `super-over-${Math.floor((n - 3) / 2) + 1}`;
  const requestedPhase = phaseOf(parsed.data.number);
  const alreadyBattedInPhase = match.innings.some(
    (i) =>
      phaseOf(i.number) === requestedPhase &&
      i.battingTeamId === parsed.data.battingTeamId
  );
  if (alreadyBattedInPhase) {
    return NextResponse.json(
      {
        error:
          requestedPhase === "regular"
            ? "This team has already batted in this match. Only the other team can bat next."
            : "This team has already batted in this super over. The other team must bat now."
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

  if (parsed.data.isSuperOver && parsed.data.number < 3) {
    return NextResponse.json(
      {
        error:
          "Super Over innings must be started from the tie-break screen (innings 3+), not as innings 1 or 2."
      },
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
