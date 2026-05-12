import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isOrganizer } from "@/lib/roles";

const PatchSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"])
});

/**
 * Approve or reject a pending join request.
 * Only organizers can call this. Approving sets the Player's teamId to the
 * requested team.
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isOrganizer(session.user.role)) {
    return NextResponse.json(
      { error: "Only organizers can resolve join requests." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const request = await prisma.joinRequest.findUnique({
    where: { id: params.id }
  });
  if (!request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }
  if (request.status !== "PENDING") {
    return NextResponse.json(
      { error: `Request already ${request.status.toLowerCase()}.` },
      { status: 409 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.joinRequest.update({
      where: { id: request.id },
      data: { status: parsed.data.status }
    });
    if (parsed.data.status === "APPROVED") {
      await tx.player.update({
        where: { id: request.playerId },
        data: { teamId: request.teamId }
      });
    }
  });

  return NextResponse.json({ ok: true });
}

/**
 * A player can withdraw their own pending request.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const request = await prisma.joinRequest.findUnique({
    where: { id: params.id },
    include: { player: { select: { userId: true } } }
  });
  if (!request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  const isOwner = request.player.userId === session.user.id;
  if (!isOwner && !isOrganizer(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.joinRequest.delete({ where: { id: request.id } });
  return NextResponse.json({ ok: true });
}
