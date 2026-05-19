import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDedicatedSuperOverInnings } from "@/lib/inningsRules";

const PatchSchema = z.object({
  isSuperOver: z.boolean().optional(),
  superOverOneActive: z.boolean().optional(),
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

  const data: { isSuperOver?: boolean; superOverOneActive?: boolean; isClosed?: boolean } =
    {};

  if (typeof parsed.data.isSuperOver === "boolean") {
    if (innings.isClosed) {
      return NextResponse.json(
        { error: "Innings is already closed." },
        { status: 409 }
      );
    }
    if (parsed.data.isSuperOver && innings.number < 3) {
      return NextResponse.json(
        {
          error:
            "Tie-break Super Over cannot be enabled on innings 1 or 2. After a tie, use “Start Super Over” from the match screen."
        },
        { status: 409 }
      );
    }
    if (!parsed.data.isSuperOver && isDedicatedSuperOverInnings(innings)) {
      return NextResponse.json(
        {
          error:
            "Cannot turn off Super Over on a dedicated super-over innings."
        },
        { status: 409 }
      );
    }
    data.isSuperOver = parsed.data.isSuperOver;
  }

  if (typeof parsed.data.superOverOneActive === "boolean") {
    if (innings.isClosed) {
      return NextResponse.json(
        { error: "Innings is already closed." },
        { status: 409 }
      );
    }
    if (innings.number >= 3) {
      return NextResponse.json(
        { error: "Super Over 1 is only available in regular innings (1 & 2)." },
        { status: 409 }
      );
    }
    if (parsed.data.superOverOneActive) {
      if (innings.totalBalls % 6 !== 0) {
        return NextResponse.json(
          {
            error:
              "Super Over 1 can only be turned on at the start of an over (between overs or before the first ball)."
          },
          { status: 409 }
        );
      }
      if (innings.superOverOneActive) {
        return NextResponse.json(
          { error: "Super Over 1 is already active for this over." },
          { status: 409 }
        );
      }
    }
    data.superOverOneActive = parsed.data.superOverOneActive;
  }

  if (typeof parsed.data.isClosed === "boolean") {
    data.isClosed = parsed.data.isClosed;
  }

  const updated = await prisma.innings.update({
    where: { id: innings.id },
    data
  });
  return NextResponse.json(updated);
}
