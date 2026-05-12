import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CreateSchema = z.object({
  name: z.string().min(1).max(80),
  role: z.enum(["BATTER", "BOWLER", "ALL_ROUNDER", "WICKETKEEPER"]).default("BATTER"),
  battingHand: z.enum(["LEFT", "RIGHT"]).default("RIGHT"),
  jerseyNo: z.number().int().min(0).max(999).optional(),
  bowlingArm: z.enum(["LEFT", "RIGHT"]).optional(),
  bowlingType: z.enum(["FAST", "MEDIUM", "SPIN", "LEG_SPIN", "OFF_SPIN"]).optional()
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const team = await prisma.team.findUnique({ where: { id: params.id } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const player = await prisma.player.create({
    data: {
      name: data.name.trim(),
      role: data.role,
      battingHand: data.battingHand,
      jerseyNo: data.jerseyNo ?? null,
      bowlingArm: data.bowlingArm ?? null,
      bowlingType: data.bowlingType ?? null,
      teamId: team.id
    }
  });

  return NextResponse.json(player, { status: 201 });
}
