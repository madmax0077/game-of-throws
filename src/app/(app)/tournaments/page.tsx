import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import {
  getViewer,
  tournamentVisibilityWhere
} from "@/lib/tournamentVisibility";

export const dynamic = "force-dynamic";

export default async function TournamentsPage() {
  const viewer = await getViewer();
  const tournaments = await prisma.tournament.findMany({
    where: tournamentVisibilityWhere(viewer),
    orderBy: { startDate: "desc" },
    include: { _count: { select: { teams: true, matches: true } } }
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Tournaments</h1>
          <p className="mt-1 text-ink-600">
            Browse and manage all your cricket tournaments.
          </p>
        </div>
        <Link href="/tournaments/new" className="btn-primary">
          + New tournament
        </Link>
      </header>

      {tournaments.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-ink-600">No tournaments yet.</p>
          <Link href="/tournaments/new" className="btn-primary mt-4 inline-flex">
            Create your first tournament
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => {
            const ownedByViewer = viewer.userId === t.organizerId;
            const isPending = t.approvalStatus === "PENDING";
            const isRejected = t.approvalStatus === "REJECTED";
            return (
              <Link
                key={t.id}
                href={`/tournaments/${t.id}`}
                className="card overflow-hidden p-0 transition hover:-translate-y-0.5 hover:shadow-glow"
              >
                <div className="h-24 bg-gradient-to-br from-brand-700 to-brand-900 p-5 text-white">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={
                        t.status === "LIVE"
                          ? "badge-live bg-white/20 text-white"
                          : t.status === "COMPLETED"
                          ? "badge-completed bg-white/20 text-white"
                          : "badge-upcoming bg-white/20 text-white"
                      }
                    >
                      {t.status}
                    </span>
                    {isPending && ownedByViewer && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                        Pending approval
                      </span>
                    )}
                    {isRejected && ownedByViewer && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                        Rejected
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3 font-display text-lg font-bold leading-tight">
                    {t.name}
                  </h3>
                </div>
                <div className="p-5">
                  <p className="text-sm text-ink-600">
                    {t.city} • {t.overs} {t.overs === 1 ? "over" : "overs"} a side
                  </p>
                  <p className="mt-1 text-xs text-ink-500">
                    {formatDate(t.startDate)} — {formatDate(t.endDate)}
                  </p>
                  <div className="mt-4 flex gap-4 text-xs text-ink-500">
                    <span><b className="text-ink-900">{t._count.teams}</b> teams</span>
                    <span><b className="text-ink-900">{t._count.matches}</b> matches</span>
                  </div>
                  {isPending && ownedByViewer && (
                    <p className="mt-3 rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800">
                      Waiting for an admin to approve. Only you can see this
                      tournament until then.
                    </p>
                  )}
                  {isRejected && ownedByViewer && (
                    <p className="mt-3 rounded-md bg-rose-50 px-2.5 py-1.5 text-[11px] font-semibold text-rose-800">
                      Rejected by admin{t.rejectionReason ? `: ${t.rejectionReason}` : "."}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
