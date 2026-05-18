import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { isPlayer } from "@/lib/roles";
import {
  matchTournamentVisibilityWhere,
  tournamentVisibilityWhere,
  type ViewerContext
} from "@/lib/tournamentVisibility";
import { LiveAutoRefresh } from "@/components/LiveAutoRefresh";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const viewer: ViewerContext = {
    userId: session?.user?.id ?? null,
    role: session?.user?.role ?? null
  };
  if (isPlayer(session?.user?.role)) {
    return (
      <PlayerDashboard
        viewer={viewer}
        userId={session!.user.id}
        firstName={session!.user.name?.split(" ")[0] ?? "Cricketer"}
      />
    );
  }
  return (
    <OrganizerDashboard
      viewer={viewer}
      firstName={session?.user?.name?.split(" ")[0] ?? "Cricketer"}
    />
  );
}

async function OrganizerDashboard({
  viewer,
  firstName
}: {
  viewer: ViewerContext;
  firstName: string;
}) {
  const visibilityWhere = tournamentVisibilityWhere(viewer);
  const matchVisibilityWhere = matchTournamentVisibilityWhere(viewer);
  const [tournamentsCount, teamsCount, playersCount, liveMatches, upcoming, pendingJoinCount, pendingApprovalsForViewer] =
    await Promise.all([
      prisma.tournament.count({ where: visibilityWhere }),
      prisma.team.count(),
      prisma.player.count(),
      prisma.match.findMany({
        where: { status: "LIVE", ...matchVisibilityWhere },
        include: { homeTeam: true, awayTeam: true, tournament: true },
        take: 5
      }),
      prisma.match.findMany({
        where: { status: "SCHEDULED", ...matchVisibilityWhere },
        orderBy: { scheduledAt: "asc" },
        include: { homeTeam: true, awayTeam: true, tournament: true },
        take: 5
      }),
      prisma.joinRequest.count({ where: { status: "PENDING" } }),
      viewer.userId
        ? prisma.tournament.count({
            where: {
              organizerId: viewer.userId,
              approvalStatus: "PENDING"
            }
          })
        : Promise.resolve(0)
    ]);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 inline-flex items-center gap-2">
            <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-bold text-brand-800">
              ORGANIZER
            </span>
            {pendingJoinCount > 0 && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                {pendingJoinCount} pending join request{pendingJoinCount > 1 ? "s" : ""}
              </span>
            )}
            {pendingApprovalsForViewer > 0 && (
              <Link
                href="/tournaments"
                className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 hover:bg-amber-200"
                title="Awaiting admin approval"
              >
                {pendingApprovalsForViewer} tournament{pendingApprovalsForViewer > 1 ? "s" : ""} awaiting approval
              </Link>
            )}
          </div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-ink-600">
            Schedule a tournament — that&apos;s the entire job.
          </p>
        </div>
        <Link href="/tournaments/new" className="btn-primary">
          + Schedule tournament
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

      {/* Keep the 'Live now' tile fresh while at least one match is live. */}
      {liveMatches.length > 0 && <LiveAutoRefresh intervalMs={5000} />}
    </div>
  );
}

async function PlayerDashboard({
  viewer,
  userId,
  firstName
}: {
  viewer: ViewerContext;
  userId: string;
  firstName: string;
}) {
  const matchVisibilityWhere = matchTournamentVisibilityWhere(viewer);
  const visibilityWhere = tournamentVisibilityWhere(viewer);
  // Find the player profile for this user.
  const myPlayer = await prisma.player.findFirst({
    where: { userId },
    include: { team: { include: { tournament: true } } }
  });

  const [liveMatches, upcoming, myRequests, openTournaments] = await Promise.all([
    prisma.match.findMany({
      where: { status: "LIVE", ...matchVisibilityWhere },
      include: { homeTeam: true, awayTeam: true, tournament: true },
      take: 5
    }),
    prisma.match.findMany({
      where: { status: "SCHEDULED", ...matchVisibilityWhere },
      orderBy: { scheduledAt: "asc" },
      include: { homeTeam: true, awayTeam: true, tournament: true },
      take: 5
    }),
    myPlayer
      ? prisma.joinRequest.findMany({
          where: { playerId: myPlayer.id },
          include: { team: { include: { tournament: true } } },
          orderBy: { updatedAt: "desc" }
        })
      : Promise.resolve([] as never[]),
    prisma.tournament.findMany({
      where: {
        AND: [
          visibilityWhere,
          { status: { in: ["UPCOMING", "LIVE"] } }
        ]
      },
      orderBy: { startDate: "desc" },
      take: 6
    })
  ]);

  // Treat the profile as "needs your attention" until the player has filled
  // in cricket-specific details that organizers care about.
  const profileIncomplete = !myPlayer || !myPlayer.bowlingArm;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 inline-flex items-center gap-2">
            <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-bold text-brand-800">
              PLAYER
            </span>
            {myPlayer?.team && (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                {myPlayer.team.shortName}
              </span>
            )}
          </div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            Welcome, {firstName}
          </h1>
          <p className="mt-1 text-ink-600">
            Catch live scores, join a team, and track your stats.
          </p>
        </div>
        <Link href="/me" className="btn-primary">
          {profileIncomplete ? "Complete your profile" : "Edit profile"}
        </Link>
      </header>

      {profileIncomplete && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <b>Tip:</b> Fill in your batting / bowling details so organizers can
          find and pick you for their teams.{" "}
          <Link href="/me" className="font-semibold underline">
            Update profile →
          </Link>
        </div>
      )}

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
              <p className="text-sm text-ink-500">Nothing live right now. Check back soon.</p>
            ) : (
              liveMatches.map((m) => (
                <Link
                  key={m.id}
                  href={`/watch/${m.id}`}
                  className="flex items-center justify-between rounded-lg border border-ink-100 p-3 hover:border-brand-200 hover:bg-brand-50/30"
                >
                  <div>
                    <span className="badge-live">Live</span>
                    <p className="mt-1 text-sm font-semibold">
                      {m.homeTeam.shortName} vs {m.awayTeam.shortName}
                    </p>
                    <p className="text-xs text-ink-500">{m.tournament.name}</p>
                  </div>
                  <span className="text-sm text-brand-700 font-semibold">Watch →</span>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Open tournaments</h2>
            <Link href="/tournaments" className="text-sm text-brand-700 hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {openTournaments.length === 0 ? (
              <p className="text-sm text-ink-500">No tournaments scheduled yet.</p>
            ) : (
              openTournaments.map((t) => (
                <Link
                  key={t.id}
                  href={`/tournaments/${t.id}`}
                  className="flex items-center justify-between rounded-lg border border-ink-100 p-3 hover:border-brand-200"
                >
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-ink-500">
                      {t.format} • {formatDateTime(t.startDate)}
                    </p>
                  </div>
                  <span className="text-sm text-brand-700 font-semibold">Join →</span>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {myRequests.length > 0 && (
        <section className="card p-6">
          <h2 className="font-display text-lg font-bold">Your join requests</h2>
          <div className="mt-4 space-y-3">
            {myRequests.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-ink-100 p-3"
              >
                <div>
                  <p className="text-sm font-semibold">{r.team.name}</p>
                  <p className="text-xs text-ink-500">
                    {r.team.tournament?.name ?? "—"}
                  </p>
                </div>
                <StatusPill status={r.status} />
              </div>
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="card p-6">
          <h2 className="font-display text-lg font-bold">Upcoming matches</h2>
          <div className="mt-4 space-y-3">
            {upcoming.map((m) => (
              <Link
                key={m.id}
                href={`/watch/${m.id}`}
                className="flex items-center justify-between rounded-lg border border-ink-100 p-3 hover:border-brand-200"
              >
                <div>
                  <span className="badge-upcoming">Upcoming</span>
                  <p className="mt-1 text-sm font-semibold">
                    {m.homeTeam.shortName} vs {m.awayTeam.shortName}
                  </p>
                  <p className="text-xs text-ink-500">
                    {formatDateTime(m.scheduledAt)} • {m.tournament.name}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {liveMatches.length > 0 && <LiveAutoRefresh intervalMs={5000} />}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "APPROVED"
      ? "bg-emerald-100 text-emerald-800"
      : status === "REJECTED"
      ? "bg-rose-100 text-rose-800"
      : "bg-amber-100 text-amber-800";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>
      {status}
    </span>
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
