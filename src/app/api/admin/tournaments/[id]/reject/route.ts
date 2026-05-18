import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";

const RejectSchema = z.object({
  reason: z.string().max(280).optional()
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = RejectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
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
      approvalStatus: "REJECTED",
      approvedAt: null,
      approvedById: null,
      rejectionReason: parsed.data.reason?.trim() || null
    }
  });

  return NextResponse.json(updated);
}
