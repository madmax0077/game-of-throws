import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";

/**
 * DELETE /api/admin/tournaments/:id
 *
 * Permanently removes a tournament. Matches, innings and balls cascade
 * with the tournament (per the schema). Teams have `onDelete: SetNull` on
 * the tournament relation, so they survive the delete as "orphan" teams
 * the organizer can re-attach to another tournament later.
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

  const existing = await prisma.tournament.findUnique({
    where: { id: params.id },
    select: { id: true, name: true }
  });
  if (!existing) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  await prisma.tournament.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true, id: existing.id, name: existing.name });
}
