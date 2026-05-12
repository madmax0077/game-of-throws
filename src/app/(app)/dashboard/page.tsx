import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  const [tournamentsCount, teamsCount, playersCount, liveMatches, upcoming] =
    await Promise.all([
      prisma.tournament.count(),
      prisma.team.count(),
      prisma.player.count(),
      prisma.match.findMany({
        where: { status: "LIVE" },
        include: { homeTeam: true, awayTeam: true, tournament: true },
        take: 5
      }),
      prisma.match.findMany({
        where: { status: "SCHEDULED" },
        orderBy: { scheduledAt: "asc" },
        include: { homeTeam: true, awayTeam: true, tournament: true },
        take: 5
      })
    ]);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            Welcome back, {session?.user?.name?.split(" ")[0] ?? "Cricketer"}
          </h1>
          <p className="mt-1 text-ink-600">
            Here&apos;s what&apos;s happening on Game of Throws today.
          </p>
        </div>
        <Link href="/tournaments/new" className="btn-primary">
          + New tournament
        </Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tournaments" value={tournamentsCount} href="/tournaments" />
        <StatCard label="Teams" value={teamsCount} href="/teams" />
        <StatCard label="Players" value={playersCount} href="/players" />
        <StatCard label="Live matches" value={liveMatches.length} href="/matches" highlight />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Live now</h2>
            <Link href="/matches" className="text-sm text-brand-700 hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {liveMatches.length === 0 ? (
              <p className="text-sm text-ink-500">No matches are live right now.</p>
            ) : (
              liveMatches.map((m) => (
                <Link
                  key={m.id}
                  href={`/matches/${m.id}`}
                  className="flex items-center justify-between rounded-lg border border-ink-100 p-3 hover:border-brand-200 hover:bg-brand-50/30"
                >
                  <div>
                    <span className="badge-live">Live</span>
                    <p className="mt-1 text-sm font-semibold">
                      {m.homeTeam.shortName} vs {m.awayTeam.shortName}
                    </p>
                    <p className="text-xs text-ink-500">{m.tournament.name}</p>
                  </div>
                  <span className="text-sm text-brand-700 font-semibold">Score →</span>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Upcoming matches</h2>
            <Link href="/matches" className="text-sm text-brand-700 hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {upcoming.length === 0 ? (
              <p className="text-sm text-ink-500">No upcoming matches scheduled.</p>
            ) : (
              upcoming.map((m) => (
                <Link
                  key={m.id}
                  href={`/matches/${m.id}`}
                  className="flex items-center justify-between rounded-lg border border-ink-100 p-3 hover:border-brand-200"
                >
                  <div>
                    <span className="badge-upcoming">Upcoming</span>
                    <p className="mt-1 text-sm font-semibold">
                      {m.homeTeam.shortName} vs {m.awayTeam.shortName}
                    </p>
                    <p className="text-xs text-ink-500">
                      {formatDateTime(m.scheduledAt)} • {m.venue}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  highlight
}: {
  label: string;
  value: number;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`card p-5 transition hover:-translate-y-0.5 hover:shadow-glow ${
        highlight ? "border-brand-200 bg-brand-50/40" : ""
      }`}
    >
      <p className="text-sm font-medium text-ink-500">{label}</p>
      <p className="mt-2 font-display text-3xl font-extrabold">{value}</p>
    </Link>
  );
}
