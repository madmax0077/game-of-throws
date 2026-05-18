import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

/**
 * The app supports exactly **one** ADMIN account. Its credentials live in
 * environment variables so they aren't checked into the repo:
 *
 *   ADMIN_EMAIL     - email for the admin account
 *   ADMIN_PASSWORD  - password for the admin account
 *
 * If those variables aren't set we fall back to the safe defaults below so
 * the first-ever deploy still works. You should set ADMIN_PASSWORD in your
 * Vercel project settings as soon as possible and rotate it whenever you
 * want — the bootstrap re-hashes and updates the DB on the next admin-page
 * render.
 */
const DEFAULT_ADMIN_EMAIL = "admin@cricamdcos.buzz";
const DEFAULT_ADMIN_PASSWORD = "Royal!Throws#2026";

export function getConfiguredAdminEmail(): string {
  return (process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim().toLowerCase();
}

function getConfiguredAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
}

/**
 * Ensure the configured admin user exists and has role=ADMIN with the
 * configured password. Also demote any *other* user that somehow ended up
 * with role=ADMIN so the system has a single, well-known admin.
 *
 * Safe to call from a server component on every render — it is idempotent
 * and only writes to the DB when something actually drifts.
 */
export async function ensureAdminUser(): Promise<{
  email: string;
  created: boolean;
  passwordRotated: boolean;
  rolesNormalized: number;
}> {
  const email = getConfiguredAdminEmail();
  const password = getConfiguredAdminPassword();

  const existing = await prisma.user.findUnique({ where: { email } });

  let created = false;
  let passwordRotated = false;

  if (!existing) {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        email,
        name: "Admin",
        passwordHash,
        role: "ADMIN"
      }
    });
    created = true;
  } else {
    const needsPasswordUpdate = !(await bcrypt.compare(password, existing.passwordHash));
    const updates: { role?: string; passwordHash?: string } = {};
    if (existing.role !== "ADMIN") updates.role = "ADMIN";
    if (needsPasswordUpdate) {
      updates.passwordHash = await bcrypt.hash(password, 10);
      passwordRotated = true;
    }
    if (Object.keys(updates).length > 0) {
      await prisma.user.update({ where: { id: existing.id }, data: updates });
    }
  }

  // Demote any *other* user that has role=ADMIN — we only allow one.
  const demoted = await prisma.user.updateMany({
    where: { role: "ADMIN", email: { not: email } },
    data: { role: "ORGANIZER" }
  });

  return {
    email,
    created,
    passwordRotated,
    rolesNormalized: demoted.count
  };
}
