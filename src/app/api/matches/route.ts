import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CreateSchema = z.object({
  tournamentId: z.string(),
  homeTeamId: z.string(),
  awayTeamId: z.string(),
  venue: z.string(),
  scheduledAt: z.string(),
  overs: z.number().int().min(1).max(90).default(20)
});

export async function GET() {
  const matches = await prisma.match.findMany({
    include: { homeTeam: true, awayTeam: true, tournament: true }
  });
  return NextResponse.json(matches);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;
  const match = await prisma.match.create({
    data: { ...data, scheduledAt: new Date(data.scheduledAt) }
  });
  return NextResponse.json(match, { status: 201 });
}
