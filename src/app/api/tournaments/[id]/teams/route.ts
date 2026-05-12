import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CreateSchema = z.object({
  name: z.string().min(2).max(80),
  shortName: z.string().min(2).max(5),
  homeCity: z.string().optional()
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

  // Team is created empty — the organizer adds players manually.
  const team = await prisma.team.create({
    data: {
      name: data.name,
      shortName: data.shortName.toUpperCase(),
      homeCity: data.homeCity ?? null,
      tournamentId: params.id
    }
  });

  return NextResponse.json(team, { status: 201 });
}
