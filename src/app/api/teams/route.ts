import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CreateSchema = z.object({
  name: z.string().min(2).max(80),
  shortName: z.string().min(2).max(5),
  homeCity: z.string().optional(),
  tournamentId: z.string().optional()
});

export async function GET() {
  const teams = await prisma.team.findMany({ include: { tournament: true } });
  return NextResponse.json(teams);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const team = await prisma.team.create({ data: parsed.data });
  return NextResponse.json(team, { status: 201 });
}
