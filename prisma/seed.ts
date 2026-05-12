import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Game of Throws database...");

  // Demo organizer
  const passwordHash = await bcrypt.hash("password123", 10);
  const organizer = await prisma.user.upsert({
    where: { email: "demo@gameofthrows.com" },
    update: {},
    create: {
      email: "demo@gameofthrows.com",
      name: "Demo Organizer",
      passwordHash,
      role: "ORGANIZER"
    }
  });

  // Demo tournament
  const tournament = await prisma.tournament.create({
    data: {
      name: "Throws Premier League 2026",
      city: "Mumbai",
      format: "T20",
      ballType: "LEATHER",
      startDate: new Date("2026-06-01"),
      endDate: new Date("2026-06-30"),
      status: "LIVE",
      organizerId: organizer.id
    }
  });

  const teamSeeds = [
    { name: "Mumbai Mavericks",    shortName: "MUM", homeCity: "Mumbai" },
    { name: "Chennai Chargers",    shortName: "CHE", homeCity: "Chennai" },
    { name: "Bangalore Bolts",     shortName: "BLR", homeCity: "Bangalore" },
    { name: "Delhi Dynamos",       shortName: "DEL", homeCity: "Delhi" }
  ];

  const teams = [];
  for (const t of teamSeeds) {
    const team = await prisma.team.create({
      data: { ...t, tournamentId: tournament.id }
    });
    teams.push(team);

    // 11 players per team
    const roles = [
      "BATTER", "BATTER", "BATTER", "BATTER",
      "ALL_ROUNDER", "ALL_ROUNDER",
      "WICKETKEEPER",
      "BOWLER", "BOWLER", "BOWLER", "BOWLER"
    ];
    for (let i = 0; i < 11; i++) {
      await prisma.player.create({
        data: {
          name: `${t.shortName} Player ${i + 1}`,
          role: roles[i],
          battingHand: i % 3 === 0 ? "LEFT" : "RIGHT",
          jerseyNo: i + 1,
          teamId: team.id
        }
      });
    }
  }

  // One scheduled and one live match
  await prisma.match.create({
    data: {
      tournamentId: tournament.id,
      homeTeamId: teams[0].id,
      awayTeamId: teams[1].id,
      venue: "Wankhede Stadium",
      scheduledAt: new Date("2026-06-05T14:30:00Z"),
      overs: 20,
      status: "LIVE"
    }
  });

  await prisma.match.create({
    data: {
      tournamentId: tournament.id,
      homeTeamId: teams[2].id,
      awayTeamId: teams[3].id,
      venue: "M Chinnaswamy Stadium",
      scheduledAt: new Date("2026-06-07T14:30:00Z"),
      overs: 20,
      status: "SCHEDULED"
    }
  });

  console.log("Seed complete.");
  console.log("Login with: demo@gameofthrows.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
