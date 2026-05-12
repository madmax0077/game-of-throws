import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CreateSchema = z.object({
  homeTeamId: z.string(),
  awayTeamId: z.string(),
  venue: z.string().min(2).max(120),
  scheduledAt: z.string().optional(), // ISO; defaults to now
  overs: z.number().int().min(1).max(50).optional()
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tournament = await prisma.tournament.findUnique({ where: { id: params.id } });
  if (!tournament)
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;
  if (data.homeTeamId === data.awayTeamId) {
    return NextResponse.json(
      { error: "Home and away teams must differ." },
      { status: 400 }
    );
  }

  // Scoring can begin before the tournament's scheduled start date; no date guard.
  const scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : new Date();

  const match = await prisma.match.create({
    data: {
      tournamentId: params.id,
      homeTeamId: data.homeTeamId,
      awayTeamId: data.awayTeamId,
      venue: data.venue,
      scheduledAt,
      overs: data.overs ?? tournament.overs
    }
  });
  return NextResponse.json(match, { status: 201 });
}
