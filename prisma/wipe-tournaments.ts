import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Order matters because of FK references:
  // Ball -> Player (no cascade), Innings -> Match (cascade), Match -> Tournament (cascade)
  const balls = await prisma.ball.deleteMany();
  const innings = await prisma.innings.deleteMany();
  const matches = await prisma.match.deleteMany();
  const players = await prisma.player.deleteMany();
  const teams = await prisma.team.deleteMany();
  const tournaments = await prisma.tournament.deleteMany();

  console.log(
    `Deleted: ${tournaments.count} tournaments, ${matches.count} matches, ${innings.count} innings, ${balls.count} balls, ${teams.count} teams, ${players.count} players.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
