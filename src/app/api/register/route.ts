import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const RegisterSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: z.enum(["ORGANIZER", "PLAYER"]).default("ORGANIZER")
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { name, email, password, role } = parsed.data;
    const normalizedEmail = email.toLowerCase();
    const exists = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });
    if (exists) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }
    const passwordHash = await bcrypt.hash(password, 10);

    // Player accounts also get a corresponding Player profile so they can be
    // picked when organizers build squads and so they can request to join teams.
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email: normalizedEmail, passwordHash, role }
      });
      let player = null as { id: string } | null;
      if (role === "PLAYER") {
        player = await tx.player.create({
          data: {
            name,
            role: "BATTER", // Sensible default; player can edit later on /me.
            battingHand: "RIGHT",
            userId: user.id
          },
          select: { id: true }
        });
      }
      return { user, player };
    });

    return NextResponse.json(
      {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        playerId: result.player?.id ?? null
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("[register] error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
