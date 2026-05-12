import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: params.id },
    include: { teams: true, matches: true }
  });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(tournament);
}
