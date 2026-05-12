/**
 * Role helpers — keep this single-source-of-truth so all guards behave the same.
 *
 * Roles in the DB are stored as strings:
 *   - "ORGANIZER"  → full access to manage tournaments, teams, scoring
 *   - "PLAYER"     → can browse, manage own profile, request to join teams
 *   - "ADMIN"      → reserved for future, treated like ORGANIZER
 *   - "USER"       → legacy default before role-split; treated as ORGANIZER
 */

export type AppRole = "ORGANIZER" | "PLAYER" | "ADMIN" | "USER";

export function isPlayer(role: string | null | undefined): boolean {
  return role === "PLAYER";
}

export function isOrganizer(role: string | null | undefined): boolean {
  // Anything that isn't a player is allowed to organize (back-compat with
  // pre-split accounts whose role is "USER" and future-compat with ADMIN).
  return !!role && role !== "PLAYER";
}

export function roleLabel(role: string | null | undefined): string {
  if (role === "PLAYER") return "Player";
  if (role === "ADMIN") return "Admin";
  return "Organizer";
}

/**
 * Server-side guard: throws a Next.js redirect to /dashboard if the current
 * session belongs to a player. Use at the top of any page that's
 * organizer-only (e.g. /tournaments/new, /teams, /matches).
 */
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export async function requireOrganizer(): Promise<{ id: string; role: string }> {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (isPlayer(session.user.role)) redirect("/dashboard");
  return { id: session.user.id, role: session.user.role };
}
