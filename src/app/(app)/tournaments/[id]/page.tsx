import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime } from "@/lib/utils";
import { isPlayer } from "@/lib/roles";
import { AddTeamForm } from "@/components/AddTeamForm";
import { ScheduleMatchForm } from "@/components/ScheduleMatchForm";
import { JoinTeamButton } from "@/components/JoinTeamButton";

export const dynamic = "force-dynamic";

export default async function TournamentDetailPage({
  params
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  const player = isPlayer(session?.user?.role);

  const tournament = await prisma.tournament.findUnique({
    where: { id: params.id },
    include: {
      teams: {
        include: {
          _count: { select: { players: true } },
          players: { select: { id: true, userId: true } }
        }
      },
      matches: {
        include: {
          homeTeam: true,
          awayTeam: true,
          innings: {
            // Only count closed innings (skip super overs) for NRR.
            where: { isClosed: true, isSuperOver: false },
            orderBy: { number: "asc" },
            select: {
              number: true,
              battingTeamId: true,
              bowlingTeamId: true,
              totalRuns: true,
              totalWickets: true,
              totalBalls: true
            }
          }
        },
        orderBy: { scheduledAt: "asc" }
      }
    }
  });

  if (!tournament) notFound();

  // For the player view: figure out their join state per team.
  // (We only fetch the data when actually viewing as a player.)
  let myPlayer: { id: string; teamId: string | null } | null = null;
  let myRequestsByTeam = new Map<string, "PENDING" | "APPROVED" | "REJECTED">();
  if (player && session) {
    const me = await prisma.player.findFirst({
      where: { userId: session.user.id },
      select: { id: true, teamId: true }
    });
    myPlayer = me;
    if (me) {
      const reqs = await prisma.joinRequest.findMany({
        where: {
          playerId: me.id,
          teamId: { in: tournament.teams.map((t) => t.id) }
        },
        select: { teamId: true, status: true }
      });
      reqs.forEach((r) =>
        myRequestsByTeam.set(r.teamId, r.status as "PENDING" | "APPROVED" | "REJECTED")
      );
    }
  }

  // Find the team I'm currently in within THIS tournament, if any.
  const myTeamInThisTournament = tournament.teams.find((t) =>
    t.players.some((p) => p.id === myPlayer?.id)
  );

  // Points: wins worth 2, ties 1, losses 0.
  const stats = new Map<
    string,
    {
      played: number;
      wins: number;
      losses: number;
      ties: number;
      runsFor: number;
      oversFor: number;
      runsAgainst: number;
      oversAgainst: number;
    }
  >();
  tournament.teams.forEach((t) =>
    stats.set(t.id, {
      played: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      runsFor: 0,
      oversFor: 0,
      runsAgainst: 0,
      oversAgainst: 0
    })
  );

  // Player counts per team — needed to derive whether an innings ended
  // via "all out" (which forces the full allotted overs to be used in
  // the NRR denominator, per the ICC rule).
  const playerCountByTeam = new Map<string, number>();
  tournament.teams.forEach((t) =>
    playerCountByTeam.set(t.id, t._count.players)
  );

  tournament.matches
    .filter((m) => m.status === "COMPLETED" && m.resultText)
    .forEach((m) => {
      const home = stats.get(m.homeTeamId);
      const away = stats.get(m.awayTeamId);
      if (!home || !away) return;
      home.played++;
      away.played++;
      if (m.resultText?.startsWith(m.homeTeam.shortName)) {
        home.wins++;
        away.losses++;
      } else if (m.resultText?.startsWith(m.awayTeam.shortName)) {
        away.wins++;
        home.losses++;
      } else {
        home.ties++;
        away.ties++;
      }

      // Net Run Rate accumulation from this match's innings, ICC-style.
      //
      // The denominator for each innings is the "effective overs":
      //   - bowled out before the overs ran out   →  full match.overs
      //                                              (so a team can't
      //                                              inflate its NRR by
      //                                              being skittled fast)
      //   - chasing side that overhauls the target →  actual overs faced
      //                                              (a fast chase
      //                                              boosts NRR — and the
      //                                              concession rate
      //                                              against the bowling
      //                                              side is correctly
      //                                              high)
      //   - everyone else (overs fully bowled)     →  actual overs faced
      //                                              (= match.overs)
      const firstInnings = m.innings.find((inn) => inn.number === 1);
      const firstRuns = firstInnings?.totalRuns ?? null;
      const maxBalls = m.overs * 6;

      for (const inn of m.innings) {
        if (inn.totalBalls === 0) continue;
        const players = playerCountByTeam.get(inn.battingTeamId) ?? 0;
        const isChaseWin =
          inn.number === 2 &&
          firstRuns !== null &&
          inn.totalRuns > firstRuns;
        const wasAllOut =
          players >= 2 &&
          inn.totalWickets >= players - 1 &&
          inn.totalBalls < maxBalls &&
          !isChaseWin;
        const effectiveOvers = wasAllOut ? m.overs : inn.totalBalls / 6;

        const batting = stats.get(inn.battingTeamId);
        const bowling = stats.get(inn.bowlingTeamId);
        if (batting) {
          batting.runsFor += inn.totalRuns;
          batting.oversFor += effectiveOvers;
        }
        if (bowling) {
          bowling.runsAgainst += inn.totalRuns;
          bowling.oversAgainst += effectiveOvers;
        }
      }
    });

  const table = tournament.teams
    .map((t) => {
      const s = stats.get(t.id)!;
      const points = s.wins * 2 + s.ties;
      const nrr =
        s.oversFor > 0 && s.oversAgainst > 0
          ? s.runsFor / s.oversFor - s.runsAgainst / s.oversAgainst
          : 0;
      return {
        team: t,
        ...s,
        points,
        nrr
      };
    })
    .sort(
      (a, b) =>
        b.points - a.points || b.nrr - a.nrr || b.wins - a.wins
    );

  const teamsForSelect = tournament.teams.map((t) => ({
    id: t.id,
    name: t.name,
    shortName: t.shortName
  }));

  // Players can request to join only when the tournament is still UPCOMING or LIVE.
  const joinsOpen =
    tournament.status === "UPCOMING" || tournament.status === "LIVE";

  return (
    <div className="space-y-8">
      <header className="card overflow-hidden p-0">
        <div className="bg-gradient-to-br from-brand-700 to-brand-900 p-8 text-white">
          <span
            className={
              tournament.status === "LIVE"
                ? "badge-live bg-white/20 text-white"
                : "badge-upcoming bg-white/20 text-white"
            }
          >
            {tournament.status}
          </span>
          <h1 className="mt-3 font-display text-3xl font-extrabold">
            {tournament.name}
          </h1>
          <p className="mt-2 text-white/80">
            {tournament.city} • {tournament.overs}{" "}
            {tournament.overs === 1 ? "over" : "overs"} a side •{" "}
            {formatDate(tournament.startDate)} – {formatDate(tournament.endDate)}
          </p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-ink-100">
          <Stat label="Teams" value={tournament.teams.length} />
          <Stat label="Matches" value={tournament.matches.length} />
          <Stat
            label="Live"
            value={tournament.matches.filter((m) => m.status === "LIVE").length}
          />
        </div>
      </header>

      {player && myTeamInThisTournament && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          You&apos;re playing for{" "}
          <Link
            href={`/teams/${myTeamInThisTournament.id}`}
            className="font-bold underline"
          >
            {myTeamInThisTournament.name}
          </Link>{" "}
          in this tournament.
        </div>
      )}

      {/* Teams */}
      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold">Teams</h2>
          {!player && <AddTeamForm tournamentId={tournament.id} />}
        </div>
        {tournament.teams.length === 0 ? (
          <p className="mt-4 text-sm text-ink-500">
            {player
              ? "No teams have joined yet — check back soon."
              : "No teams yet. Click + Add team to add your first one."}
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tournament.teams.map((t) => {
              let joinState:
                | "ALREADY_IN_TEAM"
                | "REQUESTED_PENDING"
                | "REQUESTED_APPROVED"
                | "REQUESTED_REJECTED"
                | "CAN_REQUEST"
                | "PROFILE_MISSING"
                | "NOT_OPEN"
                | null = null;
              if (player) {
                if (!myPlayer) joinState = "PROFILE_MISSING";
                else if (myTeamInThisTournament) joinState = "ALREADY_IN_TEAM";
                else if (myRequestsByTeam.has(t.id)) {
                  const s = myRequestsByTeam.get(t.id)!;
                  joinState =
                    s === "PENDING"
                      ? "REQUESTED_PENDING"
                      : s === "APPROVED"
                      ? "REQUESTED_APPROVED"
                      : "REQUESTED_REJECTED";
                } else if (!joinsOpen) joinState = "NOT_OPEN";
                else joinState = "CAN_REQUEST";
              }

              return (
                <div
                  key={t.id}
                  className="flex flex-col gap-3 rounded-lg border border-ink-100 p-3 hover:border-brand-200 hover:bg-brand-50/30"
                >
                  <Link
                    href={`/teams/${t.id}`}
                    className="flex items-center gap-3"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white">
                      {t.shortName}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-ink-500">
                        {t._count.players} players
                        {t.homeCity ? ` • ${t.homeCity}` : ""}
                      </p>
                    </div>
                  </Link>
                  {player && joinState && joinState !== "ALREADY_IN_TEAM" && (
                    <div className="flex items-center justify-between">
                      {joinState === "PROFILE_MISSING" && (
                        <Link href="/me" className="btn-outline text-xs">
                          Complete profile to join →
                        </Link>
                      )}
                      {joinState === "NOT_OPEN" && (
                        <span className="text-xs text-ink-500">
                          Tournament closed
                        </span>
                      )}
                      {joinState === "REQUESTED_PENDING" && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                          Request pending
                        </span>
                      )}
                      {joinState === "REQUESTED_APPROVED" && (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                          Approved ✓
                        </span>
                      )}
                      {joinState === "REQUESTED_REJECTED" && (
                        <JoinTeamButton
                          small
                          teamId={t.id}
                          state={{ kind: "CAN_REQUEST" }}
                        />
                      )}
                      {joinState === "CAN_REQUEST" && (
                        <JoinTeamButton
                          small
                          teamId={t.id}
                          state={{ kind: "CAN_REQUEST" }}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Schedule a match — organizer only */}
      {!player && (
        <section className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold">Schedule a match</h2>
              <p className="text-sm text-ink-500">
                Scoring can start immediately — schedule time is informational only.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <ScheduleMatchForm
              tournamentId={tournament.id}
              teams={teamsForSelect}
              defaultOvers={tournament.overs}
            />
          </div>
        </section>
      )}

      {/* Fixtures */}
      <section className="card p-6">
        <h2 className="font-display text-lg font-bold">Fixtures</h2>
        <div className="mt-4 space-y-3">
          {tournament.matches.length === 0 && (
            <p className="text-sm text-ink-500">No matches scheduled yet.</p>
          )}
          {tournament.matches.map((m) => {
            // Players use the public watch view; organizers go to the
            // match detail / scoring page.
            const href = player ? `/watch/${m.id}` : `/matches/${m.id}`;
            return (
              <Link
                key={m.id}
                href={href}
                className="flex items-center justify-between rounded-lg border border-ink-100 p-4 hover:border-brand-200"
              >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center text-xs text-ink-500">
                    <span>{formatDateTime(m.scheduledAt).split(",")[0]}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      {m.homeTeam.name} vs {m.awayTeam.name}
                    </p>
                    <p className="text-xs text-ink-500">{m.venue}</p>
                  </div>
                </div>
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
              </Link>
            );
          })}
        </div>
      </section>

      {/* Points table */}
      <section className="card p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-bold">Points table</h2>
          <p className="text-xs text-ink-500">
            Tiebreaker: Net Run Rate (runs/over scored − runs/over conceded).
          </p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-xs uppercase text-ink-500">
                <th className="py-2 pr-3">#</th>
                <th className="py-2 pr-3">Team</th>
                <th className="py-2 pr-3 text-center">P</th>
                <th className="py-2 pr-3 text-center">W</th>
                <th className="py-2 pr-3 text-center">L</th>
                <th className="py-2 pr-3 text-center">T</th>
                <th className="py-2 pr-3 text-center">Pts</th>
                <th className="py-2 text-right">NRR</th>
              </tr>
            </thead>
            <tbody>
              {table.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-3 text-center text-sm text-ink-500">
                    No teams yet.
                  </td>
                </tr>
              )}
              {table.map((row, i) => (
                <tr key={row.team.id} className="border-b border-ink-100 last:border-0">
                  <td className="py-3 pr-3 text-ink-500">{i + 1}</td>
                  <td className="py-3 pr-3 font-medium">{row.team.name}</td>
                  <td className="py-3 pr-3 text-center">{row.played}</td>
                  <td className="py-3 pr-3 text-center">{row.wins}</td>
                  <td className="py-3 pr-3 text-center">{row.losses}</td>
                  <td className="py-3 pr-3 text-center">{row.ties}</td>
                  <td className="py-3 pr-3 text-center font-bold text-brand-700">
                    {row.points}
                  </td>
                  <td
                    className={`py-3 text-right font-mono text-xs font-semibold ${
                      row.played === 0
                        ? "text-ink-400"
                        : row.nrr >= 0
                        ? "text-emerald-700"
                        : "text-rose-700"
                    }`}
                  >
                    {row.played === 0
                      ? "—"
                      : (row.nrr >= 0 ? "+" : "") + row.nrr.toFixed(3)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-5 text-center">
      <p className="text-xs uppercase text-ink-500">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}
