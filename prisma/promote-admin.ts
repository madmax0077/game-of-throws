/**
 * Promote a user to the ADMIN role.
 *
 *   npx tsx prisma/promote-admin.ts <email>
 *   # or
 *   pnpm tsx prisma/promote-admin.ts <email>
 *
 * After promoting, the next time that user signs in (or refreshes the page
 * while signed in) their JWT picks up the new role automatically — no need
 * to re-deploy.
 */
import { PrismaClient } from "@prisma/client";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error("Usage: npx tsx prisma/promote-admin.ts <email>");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error(`No user found for ${email}`);
      process.exit(2);
    }
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { role: "ADMIN" }
    });
    console.log(`OK — ${updated.email} is now ADMIN.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(99);
});
