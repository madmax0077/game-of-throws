import type { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";

/**
 * Tournament moderation lifecycle.
 *
 * New tournaments start as PENDING and are only visible to their organizer
 * and to admins. An admin approves them (APPROVED), at which point they are
 * visible to everyone. A rejected tournament (REJECTED) stays hidden from
 * the public but the owning organizer can still see it (with a reason) so
 * they can delete or recreate it.
 */
export const APPROVAL_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export type ViewerContext = {
  userId: string | null;
  role: string | null;
};

export async function getViewer(): Promise<ViewerContext> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { userId: null, role: null };
  return { userId: session.user.id, role: session.user.role ?? null };
}

/**
 * Returns a Prisma `where` clause that limits Tournament queries to rows the
 * given viewer is allowed to see:
 *
 *   - admins                → every tournament
 *   - signed-in non-admins  → APPROVED tournaments + their own (any status)
 *   - anonymous viewers     → APPROVED tournaments only
 */
export function tournamentVisibilityWhere(
  viewer: ViewerContext
): Prisma.TournamentWhereInput {
  if (isAdmin(viewer.role)) return {};
  if (viewer.userId) {
    return {
      OR: [
        { approvalStatus: "APPROVED" },
        { organizerId: viewer.userId }
      ]
    };
  }
  return { approvalStatus: "APPROVED" };
}

/**
 * True if the given viewer is allowed to see a tournament row that we
 * already have in hand (e.g. when we did `findUnique` first and need to
 * decide whether to render it).
 */
export function canViewTournament(
  viewer: ViewerContext,
  tournament: { approvalStatus: string; organizerId: string }
): boolean {
  if (tournament.approvalStatus === "APPROVED") return true;
  if (isAdmin(viewer.role)) return true;
  if (viewer.userId && tournament.organizerId === viewer.userId) return true;
  return false;
}

/**
 * Same idea but expressed as a clause on a relation: use this when filtering
 * a Match query so we only return matches whose tournament the viewer is
 * allowed to see.
 */
export function matchTournamentVisibilityWhere(
  viewer: ViewerContext
): Prisma.MatchWhereInput {
  if (isAdmin(viewer.role)) return {};
  if (viewer.userId) {
    return {
      OR: [
        { tournament: { approvalStatus: "APPROVED" } },
        { tournament: { organizerId: viewer.userId } }
      ]
    };
  }
  return { tournament: { approvalStatus: "APPROVED" } };
}
