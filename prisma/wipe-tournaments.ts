/**
 * One-off cleanup: wipe every tournament, team, match, innings, ball,
 * join-request and player from the database.
 *
 * USER accounts (the table that stores logins for organizers + Google
 * players) are deliberately NOT touched, so everyone can still sign in.
 * The /me page auto-creates a stub Player when a logged-in user without
 * a Player record visits it, so player profiles will regenerate on demand.
 *
 * Run locally against PRODUCTION Postgres with:
 *   $env:DATABASE_URL="<prod-postgres-url>"
 *   npx tsx prisma/wipe-tournaments.ts
 *
 * Pass --yes to skip the 5s safety countdown.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const target = process.env.DATABASE_URL ?? "(unset)";
  const masked = target.replace(/(:\/\/[^:]+:)[^@]+@/, "$1***@");
  console.log(`[wipe] Target DB: ${masked}`);

  if (!process.argv.includes("--yes")) {
    console.log("[wipe] Wiping in 5s — Ctrl+C to abort.");
    for (let i = 5; i > 0; i--) {
      process.stdout.write(`  ${i}…\r`);
      await new Promise((r) => setTimeout(r, 1000));
    }
    console.log("");
  }

  // Order matters because of foreign-key constraints:
  // Ball -> Innings/Player/Team, Innings -> Match, Match -> Tournament
  // JoinRequest -> Team/Player, Player -> User (kept), Team -> Tournament.
  const joinRequests = await prisma.joinRequest.deleteMany();
  const balls = await prisma.ball.deleteMany();
  const innings = await prisma.innings.deleteMany();
  const matches = await prisma.match.deleteMany();
  const players = await prisma.player.deleteMany();
  const teams = await prisma.team.deleteMany();
  const tournaments = await prisma.tournament.deleteMany();

  console.log("[wipe] Done.");
  console.log(
    `  tournaments=${tournaments.count}, matches=${matches.count}, ` +
      `innings=${innings.count}, balls=${balls.count}, ` +
      `teams=${teams.count}, players=${players.count}, ` +
      `joinRequests=${joinRequests.count}`
  );
  console.log("  (User accounts were not touched.)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
