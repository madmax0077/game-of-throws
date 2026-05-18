import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatOvers } from "@/lib/utils";
import { ballPillColor, ballPillText } from "@/lib/ballLabel";
import { ShareWatchLink } from "@/components/ShareWatchLink";
import { LiveAutoRefresh } from "@/components/LiveAutoRefresh";

export const dynamic = "force-dynamic";

export default async function MatchDetail({
  params
}: {
  params: { id: string };
}) {
  const match = await prisma.match.findUnique({
    where: { id: params.id },
    include: {
      homeTeam: true,
      awayTeam: true,
      tournament: true,
      innings: {
        orderBy: { number: "asc" },
        include: {
          balls: {
            orderBy: { createdAt: "desc" },
            take: 12,
            include: { striker: true, bowler: true }
          }
        }
      }
    }
  });
  if (!match) notFound();

  return (
    <div className="space-y-6">
      <Link href="/matches" className="text-sm text-brand-700 hover:underline">
        ← All matches
      </Link>

      <header className="card overflow-hidden p-0">
        <div className="bg-gradient-to-br from-brand-700 to-brand-900 p-8 text-white">
          <div className="flex items-center justify-between">
            <span
              className={
                match.status === "LIVE"
                  ? "badge-live bg-white/20 text-white"
                  : match.status === "COMPLETED"
                  ? "badge-completed bg-white/20 text-white"
                  : "badge-upcoming bg-white/20 text-white"
              }
            >
              {match.status}
            </span>
            <p className="text-sm text-white/80">{formatDateTime(match.scheduledAt)}</p>
          </div>

          <div className="mt-6 grid grid-cols-2 items-center gap-6">
            <TeamScore
              name={match.homeTeam.name}
              short={match.homeTeam.shortName}
              innings={match.innings.find((i) => i.battingTeamId === match.homeTeamId)}
            />
            <TeamScore
              name={match.awayTeam.name}
              short={match.awayTeam.shortName}
              innings={match.innings.find((i) => i.battingTeamId === match.awayTeamId)}
              alignRight
            />
          </div>

          <p className="mt-6 text-sm text-white/80">
            {match.tournament.name} • {match.venue} • {match.overs} overs
          </p>
          {match.resultText && (
            <p className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold">
              {match.resultText}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 p-5">
          {match.status !== "COMPLETED" && (
            <Link href={`/matches/${match.id}/score`} className="btn-primary">
              {match.status === "LIVE" ? "Resume scoring" : "Start scoring"}
            </Link>
          )}
          <Link href={`/tournaments/${match.tournamentId}`} className="btn-outline">
            Tournament
          </Link>
          <div className="ml-auto">
            <ShareWatchLink
              matchId={match.id}
              matchTitle={`${match.homeTeam.name} vs ${match.awayTeam.name} — ${match.tournament.name}`}
            />
          </div>
        </div>
        <div className="border-t border-ink-100 bg-ink-50/60 px-5 py-3 text-xs text-ink-600">
          <b>Live share link:</b> anyone can open the public watch page — no
          login required. It auto-refreshes every 4 seconds while you score.
        </div>
      </header>

      <section className="card p-6">
        <h2 className="font-display text-lg font-bold">Recent balls</h2>
        {match.innings.length === 0 ? (
          <p className="mt-2 text-sm text-ink-500">No innings started yet.</p>
        ) : (
          match.innings.map((inn) => (
            <div key={inn.id} className="mt-4">
              <p className="text-sm font-semibold">
                Innings {inn.number} — {inn.totalRuns}/{inn.totalWickets} ({formatOvers(inn.totalBalls)} ov)
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {inn.balls.length === 0 && (
                  <span className="text-xs text-ink-500">No balls scored yet.</span>
                )}
                {inn.balls.slice().reverse().map((b) => (
                  <span
                    key={b.id}
                    className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-bold ${ballPillColor(
                      b
                    )}`}
                    title={b.commentary ?? ""}
                  >
                    {ballPillText(b)}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      {/* Auto-refresh the scoreboard while the match is live so spectators
          see new balls without manually reloading. */}
      {match.status === "LIVE" && <LiveAutoRefresh intervalMs={4000} />}
    </div>
  );
}

function TeamScore({
  name,
  short,
  innings,
  alignRight
}: {
  name: string;
  short: string;
  innings?: { totalRuns: number; totalWickets: number; totalBalls: number };
  alignRight?: boolean;
}) {
  return (
    <div className={alignRight ? "text-right" : ""}>
      <p className="text-xs uppercase text-white/70">{short}</p>
      <h2 className="font-display text-2xl font-bold">{name}</h2>
      {innings ? (
        <p className="mt-2 font-display text-4xl font-extrabold">
          {innings.totalRuns}
          <span className="text-2xl">/{innings.totalWickets}</span>
        </p>
      ) : (
        <p className="mt-2 font-display text-4xl font-extrabold text-white/40">—</p>
      )}
      <p className="text-xs text-white/70">
        {innings ? `${formatOvers(innings.totalBalls)} ov` : "yet to bat"}
      </p>
    </div>
  );
}
