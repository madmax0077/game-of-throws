import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PatchSchema = z.object({
  isSuperOver: z.boolean().optional(),
  isClosed: z.boolean().optional()
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; inningsId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const innings = await prisma.innings.findUnique({
    where: { id: params.inningsId }
  });
  if (!innings) return NextResponse.json({ error: "Innings not found" }, { status: 404 });
  if (innings.matchId !== params.id)
    return NextResponse.json({ error: "Mismatched match" }, { status: 400 });

  // Super-over flag can only flip at an over boundary: either before any ball
  // is bowled, or right after a complete over has been bowled. Mid-over toggle
  // is rejected so a single over isn't half-doubled.
  if (typeof parsed.data.isSuperOver === "boolean") {
    const atBoundary =
      innings.totalBalls === 0 || innings.totalBalls % 6 === 0;
    if (!atBoundary) {
      return NextResponse.json(
        {
          error:
            "Super Over can only be toggled at the start of an over, not mid-over."
        },
        { status: 409 }
      );
    }
    if (innings.isClosed) {
      return NextResponse.json(
        { error: "Innings is already closed." },
        { status: 409 }
      );
    }
  }

  const updated = await prisma.innings.update({
    where: { id: innings.id },
    data: parsed.data
  });
  return NextResponse.json(updated);
}
