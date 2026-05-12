import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isOrganizer } from "@/lib/roles";

const BodySchema = z.object({
  // Optional message the player wants to attach to the request.
  message: z.string().max(500).optional(),
  // Organizer-only: when adding an existing player profile directly to the team,
  // they pass the player's id. The endpoint auto-approves on their behalf.
  playerId: z.string().optional()
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const team = await prisma.team.findUnique({ where: { id: params.id } });
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  // Path A: organizer is adding an existing Player profile to this team.
  if (parsed.data.playerId) {
    if (!isOrganizer(session.user.role)) {
      return NextResponse.json(
        { error: "Only organizers can directly add players." },
        { status: 403 }
      );
    }
    const player = await prisma.player.findUnique({
      where: { id: parsed.data.playerId }
    });
    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }
    if (player.teamId === team.id) {
      return NextResponse.json(
        { error: "Player is already in this team." },
        { status: 409 }
      );
    }
    await prisma.player.update({
      where: { id: player.id },
      data: { teamId: team.id }
    });
    // Mark any pending join request from this player to this team as approved.
    await prisma.joinRequest.updateMany({
      where: { teamId: team.id, playerId: player.id, status: "PENDING" },
      data: { status: "APPROVED" }
    });
    return NextResponse.json({ ok: true, mode: "DIRECT_ADD" }, { status: 200 });
  }

  // Path B: a player is requesting to join this team.
  // Find the Player profile linked to the logged-in user.
  const myPlayer = await prisma.player.findFirst({
    where: { userId: session.user.id }
  });
  if (!myPlayer) {
    return NextResponse.json(
      {
        error:
          "You don't have a player profile yet. Complete your profile on /me first."
      },
      { status: 409 }
    );
  }
  if (myPlayer.teamId === team.id) {
    return NextResponse.json(
      { error: "You're already in this team." },
      { status: 409 }
    );
  }
  // Idempotent: if a pending request already exists, return it.
  const existing = await prisma.joinRequest.findUnique({
    where: { teamId_playerId: { teamId: team.id, playerId: myPlayer.id } }
  });
  if (existing) {
    if (existing.status === "PENDING") {
      return NextResponse.json(
        { ok: true, request: existing, mode: "ALREADY_PENDING" },
        { status: 200 }
      );
    }
    // Re-open a previously rejected/withdrawn request.
    const updated = await prisma.joinRequest.update({
      where: { id: existing.id },
      data: { status: "PENDING", message: parsed.data.message ?? null }
    });
    return NextResponse.json(
      { ok: true, request: updated, mode: "REOPENED" },
      { status: 200 }
    );
  }
  const created = await prisma.joinRequest.create({
    data: {
      teamId: team.id,
      playerId: myPlayer.id,
      message: parsed.data.message ?? null
    }
  });
  return NextResponse.json(
    { ok: true, request: created, mode: "CREATED" },
    { status: 201 }
  );
}
