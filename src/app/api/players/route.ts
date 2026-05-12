import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CreateSchema = z.object({
  name: z.string().min(2),
  role: z.enum(["BATTER", "BOWLER", "ALL_ROUNDER", "WICKETKEEPER"]),
  battingHand: z.enum(["LEFT", "RIGHT"]).default("RIGHT"),
  bowlingArm: z.enum(["LEFT", "RIGHT"]).optional(),
  bowlingType: z.enum(["FAST", "MEDIUM", "SPIN", "LEG_SPIN", "OFF_SPIN"]).optional(),
  jerseyNo: z.number().int().optional(),
  teamId: z.string().optional()
});

export async function GET() {
  const players = await prisma.player.findMany({ include: { team: true } });
  return NextResponse.json(players);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const player = await prisma.player.create({ data: parsed.data });
  return NextResponse.json(player, { status: 201 });
}
