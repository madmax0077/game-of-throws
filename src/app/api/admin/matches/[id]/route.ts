import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";

/**
 * DELETE /api/admin/matches/:id
 *
 * Removes a match and cascades innings + balls (per schema).
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

  const existing = await prisma.match.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      homeTeam: { select: { shortName: true } },
      awayTeam: { select: { shortName: true } }
    }
  });
  if (!existing) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  await prisma.match.delete({ where: { id: params.id } });
  return NextResponse.json({
    ok: true,
    id: existing.id,
    label: `${existing.homeTeam.shortName} vs ${existing.awayTeam.shortName}`
  });
}
