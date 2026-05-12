import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const UpdateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  shortName: z.string().min(2).max(5).optional(),
  homeCity: z.string().nullable().optional()
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const team = await prisma.team.findUnique({
    where: { id: params.id },
    include: { players: true, tournament: true }
  });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(team);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data: Record<string, unknown> = { ...parsed.data };
  if (typeof data.shortName === "string") {
    data.shortName = (data.shortName as string).toUpperCase();
  }

  try {
    const team = await prisma.team.update({
      where: { id: params.id },
      data
    });
    return NextResponse.json(team);
  } catch {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }
}
