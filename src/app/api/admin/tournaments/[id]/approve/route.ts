import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";

export async function POST(
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
    select: { id: true, approvalStatus: true }
  });
  if (!existing) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  const updated = await prisma.tournament.update({
    where: { id: params.id },
    data: {
      approvalStatus: "APPROVED",
      approvedAt: new Date(),
      approvedById: session.user.id,
      rejectionReason: null
    }
  });

  return NextResponse.json(updated);
}
