/**
 * Role helpers — keep this single-source-of-truth so all guards behave the same.
 *
 * Roles in the DB are stored as strings:
 *   - "ORGANIZER"  → can create tournaments (subject to admin approval), teams, scoring
 *   - "PLAYER"     → can browse, manage own profile, request to join teams
 *   - "ADMIN"      → super user: approves tournaments, can do everything an organizer can
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

export function isAdmin(role: string | null | undefined): boolean {
  return role === "ADMIN";
}

export function roleLabel(role: string | null | undefined): string {
  if (role === "PLAYER") return "Player";
  if (role === "ADMIN") return "Admin";
  return "Organizer";
}

/**
 * Server-side guards. Use at the top of any page or route handler that
 * needs a particular role.
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

/**
 * Page-level admin guard. Redirects non-admins to /dashboard so they
 * never see /admin URLs they can't act on.
 */
export async function requireAdmin(): Promise<{ id: string; role: string }> {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (!isAdmin(session.user.role)) redirect("/dashboard");
  return { id: session.user.id, role: session.user.role };
}
