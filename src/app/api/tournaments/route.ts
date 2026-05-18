import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";
import {
  getViewer,
  tournamentVisibilityWhere
} from "@/lib/tournamentVisibility";

const CreateSchema = z.object({
  name: z.string().min(2).max(120),
  city: z.string().min(2).max(80),
  overs: z.number().int().min(1).max(9),
  startDate: z.string(),
  endDate: z.string()
});

export async function GET() {
  const viewer = await getViewer();
  const tournaments = await prisma.tournament.findMany({
    where: tournamentVisibilityWhere(viewer),
    orderBy: { startDate: "desc" }
  });
  return NextResponse.json(tournaments);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;
  const creator = session.user;
  // Admins create pre-approved tournaments; everyone else has to wait for an
  // admin to approve before the tournament becomes publicly visible.
  const adminCreator = isAdmin(creator.role);
  const tournament = await prisma.tournament.create({
    data: {
      name: data.name,
      city: data.city,
      overs: data.overs,
      format: `T${data.overs}`,
      ballType: "LEATHER",
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      organizerId: creator.id,
      approvalStatus: adminCreator ? "APPROVED" : "PENDING",
      approvedAt: adminCreator ? new Date() : null,
      approvedById: adminCreator ? creator.id : null
    }
  });
  return NextResponse.json(tournament, { status: 201 });
}
