import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const UpdateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  role: z.enum(["BATTER", "BOWLER", "ALL_ROUNDER", "WICKETKEEPER"]).optional(),
  battingHand: z.enum(["LEFT", "RIGHT"]).optional(),
  jerseyNo: z.number().int().min(0).max(999).nullable().optional(),
  bowlingArm: z.enum(["LEFT", "RIGHT"]).nullable().optional(),
  bowlingType: z
    .enum(["FAST", "MEDIUM", "SPIN", "LEG_SPIN", "OFF_SPIN"])
    .nullable()
    .optional()
});

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

  try {
    const player = await prisma.player.update({
      where: { id: params.id },
      data: parsed.data
    });
    return NextResponse.json(player);
  } catch {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Block deletion if this player has appeared in any ball event — keeps stats intact.
  const referenced = await prisma.ball.count({
    where: {
      OR: [
        { strikerId: params.id },
        { nonStrikerId: params.id },
        { bowlerId: params.id },
        { outBatterId: params.id }
      ]
    }
  });
  if (referenced > 0) {
    return NextResponse.json(
      {
        error:
          "This player has already appeared in match events and can't be deleted. You can rename them instead."
      },
      { status: 409 }
    );
  }

  try {
    await prisma.player.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }
}
