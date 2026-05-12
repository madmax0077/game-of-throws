import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * One-shot wipe endpoint. Deletes every tournament, team, match,
 * innings, ball, join-request and player. User accounts are NOT touched
 * so existing logins (incl. Google sign-ins) keep working.
 *
 * Protected by a shared secret. Set `ADMIN_WIPE_TOKEN=<long-random>` in
 * Vercel env, then call from PowerShell:
 *
 *   $headers = @{ "x-admin-token" = "<token>" }
 *   Invoke-RestMethod -Method POST `
 *     -Uri "https://www.cricamdcos.buzz/api/admin/wipe-all" `
 *     -Headers $headers
 *
 * If the env var is unset the endpoint refuses to run.
 */
export async function POST(req: Request) {
  const expected = process.env.ADMIN_WIPE_TOKEN;
  if (!expected || expected.length < 16) {
    return NextResponse.json(
      {
        error:
          "ADMIN_WIPE_TOKEN is not configured on the server. Set a long random value (>=16 chars) in Vercel project env vars and redeploy."
      },
      { status: 503 }
    );
  }

  const provided = req.headers.get("x-admin-token");
  if (provided !== expected) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Order matters because of foreign-key constraints.
  const joinRequests = await prisma.joinRequest.deleteMany();
  const balls = await prisma.ball.deleteMany();
  const innings = await prisma.innings.deleteMany();
  const matches = await prisma.match.deleteMany();
  const players = await prisma.player.deleteMany();
  const teams = await prisma.team.deleteMany();
  const tournaments = await prisma.tournament.deleteMany();

  return NextResponse.json({
    ok: true,
    deleted: {
      tournaments: tournaments.count,
      matches: matches.count,
      innings: innings.count,
      balls: balls.count,
      teams: teams.count,
      players: players.count,
      joinRequests: joinRequests.count
    },
    note: "User accounts were intentionally preserved."
  });
}

// GET is intentionally unsupported to avoid accidental browser hits.
export async function GET() {
  return NextResponse.json(
    { error: "Use POST with x-admin-token header." },
    { status: 405 }
  );
}
