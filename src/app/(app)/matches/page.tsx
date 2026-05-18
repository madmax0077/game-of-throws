import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import {
  getViewer,
  matchTournamentVisibilityWhere
} from "@/lib/tournamentVisibility";
import { LiveAutoRefresh } from "@/components/LiveAutoRefresh";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const viewer = await getViewer();
  const matches = await prisma.match.findMany({
    where: matchTournamentVisibilityWhere(viewer),
    orderBy: [{ status: "asc" }, { scheduledAt: "asc" }],
    include: { homeTeam: true, awayTeam: true, tournament: true }
  });

  const live = matches.filter((m) => m.status === "LIVE");
  const upcoming = matches.filter((m) => m.status === "SCHEDULED");
  const completed = matches.filter((m) => m.status === "COMPLETED");

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Matches</h1>
        <p className="mt-1 text-ink-600">Live, upcoming and completed matches.</p>
      </header>

      {[
        { title: "Live now", list: live },
        { title: "Upcoming", list: upcoming },
        { title: "Recently completed", list: completed }
      ].map((section) => (
        <section key={section.title} className="space-y-3">
          <h2 className="font-display text-lg font-bold">{section.title}</h2>
          {section.list.length === 0 ? (
            <p className="text-sm text-ink-500">None.</p>
          ) : (
            <div className="grid gap-3">
              {section.list.map((m) => (
                <Link
                  key={m.id}
                  href={`/matches/${m.id}`}
                  className="card flex flex-wrap items-center justify-between gap-4 p-5 hover:-translate-y-0.5 hover:shadow-glow transition"
                >
                  <div>
                    <span
                      className={
                        m.status === "LIVE"
                          ? "badge-live"
                          : m.status === "COMPLETED"
                          ? "badge-completed"
                          : "badge-upcoming"
                      }
                    >
                      {m.status}
                    </span>
                    <p className="mt-2 font-display font-bold">
                      {m.homeTeam.name} vs {m.awayTeam.name}
                    </p>
                    <p className="text-xs text-ink-500">
                      {m.tournament.name} • {m.venue}
                    </p>
                  </div>
                  <p className="text-sm text-ink-600">{formatDateTime(m.scheduledAt)}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      ))}

      {live.length > 0 && <LiveAutoRefresh intervalMs={5000} />}
    </div>
  );
}
