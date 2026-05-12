import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PatchSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  role: z.enum(["BATTER", "BOWLER", "ALL_ROUNDER", "WICKETKEEPER"]).optional(),
  battingHand: z.enum(["RIGHT", "LEFT"]).optional(),
  bowlingArm: z.enum(["RIGHT", "LEFT"]).nullable().optional(),
  bowlingType: z
    .enum(["FAST", "MEDIUM", "SPIN", "LEG_SPIN", "OFF_SPIN"])
    .nullable()
    .optional(),
  jerseyNo: z.number().int().min(0).max(999).nullable().optional()
});

/**
 * Update the logged-in user's player profile.
 * Auto-creates a Player record if one doesn't exist yet (covers users who
 * registered before player profiles were a thing).
 */
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Also reflect display-name + avatar changes on the User record so they
  // show up consistently in the nav bar.
  const userUpdate: { name?: string; avatarUrl?: string | null } = {};
  if (parsed.data.name !== undefined) userUpdate.name = parsed.data.name;
  if (parsed.data.avatarUrl !== undefined)
    userUpdate.avatarUrl = parsed.data.avatarUrl;

  await prisma.user.update({
    where: { id: session.user.id },
    data: userUpdate
  });

  const existing = await prisma.player.findFirst({
    where: { userId: session.user.id }
  });

  if (existing) {
    const updated = await prisma.player.update({
      where: { id: existing.id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.avatarUrl !== undefined
          ? { avatarUrl: parsed.data.avatarUrl }
          : {}),
        ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
        ...(parsed.data.battingHand !== undefined
          ? { battingHand: parsed.data.battingHand }
          : {}),
        ...(parsed.data.bowlingArm !== undefined
          ? { bowlingArm: parsed.data.bowlingArm }
          : {}),
        ...(parsed.data.bowlingType !== undefined
          ? { bowlingType: parsed.data.bowlingType }
          : {}),
        ...(parsed.data.jerseyNo !== undefined
          ? { jerseyNo: parsed.data.jerseyNo }
          : {})
      }
    });
    return NextResponse.json(updated);
  }

  const created = await prisma.player.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name ?? session.user.name ?? "Player",
      role: parsed.data.role ?? "BATTER",
      battingHand: parsed.data.battingHand ?? "RIGHT",
      bowlingArm: parsed.data.bowlingArm ?? null,
      bowlingType: parsed.data.bowlingType ?? null,
      jerseyNo: parsed.data.jerseyNo ?? null,
      avatarUrl: parsed.data.avatarUrl ?? null
    }
  });
  return NextResponse.json(created, { status: 201 });
}
