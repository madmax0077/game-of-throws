import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";

/**
 * DELETE /api/admin/players/:id
 *
 * Removes a player with no ball-by-ball history. Join requests cascade.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const existing = await prisma.player.findUnique({
    where: { id: params.id },
    select: { id: true, name: true }
  });
  if (!existing) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const referenced = await prisma.ball.count({
    where: {
      OR: [
        { strikerId: params.id },
        { nonStrikerId: params.id },
        { bowlerId: params.id },
        { outBatterId: params.id },
        { fielderId: params.id }
      ]
    }
  });
  if (referenced > 0) {
    return NextResponse.json(
      {
        error:
          "This player has ball-by-ball records and cannot be deleted. Rename them instead."
      },
      { status: 409 }
    );
  }

  await prisma.player.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true, id: existing.id, name: existing.name });
}
