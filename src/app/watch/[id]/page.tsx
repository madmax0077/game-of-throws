import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatOvers } from "@/lib/utils";
import { ballPillColor, ballPillText } from "@/lib/ballLabel";
import {
  buildInningsScorecard,
  computeMatchPoints,
  pointsConfig,
  type ScorecardBall,
  type ScorecardPlayer
} from "@/lib/scorecard";
import { Logo } from "@/components/Logo";
import { LiveAutoRefresh } from "@/components/LiveAutoRefresh";
import { MatchScorecard } from "@/components/MatchScorecard";
import { MvpPanel } from "@/components/MvpPanel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type BatterStat = {
  id: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
};

type BowlerStat = {
  id: string;
  name: string;
  legalBalls: number;
  runsConceded: number;
  wickets: number;
};

export default async function WatchMatchPage({
  params
}: {
  params: { id: string };
}) {
  const match = await prisma.match.findUnique({
    where: { id: params.id },
    include: {
      homeTeam: { include: { players: true } },
      awayTeam: { include: { players: true } },
      tournament: { select: { id: true, name: true } },
      innings: {
        orderBy: { number: "asc" },
        include: {
          balls: {
            orderBy: { createdAt: "asc" },
            include: {
              striker: { select: { id: true, name: true } },
              nonStriker: { select: { id: true, name: true } },
              bowler: { select: { id: true, name: true } }
            }
          }
        }
      }
    }
  });

  if (!match) notFound();

  // Per-team player lists for the full scorecard + MVP panel.
  const toScorecardPlayer = (p: {
    id: string;
    name: string;
    role: string;
    isCaptain: boolean;
  }): ScorecardPlayer => ({
    id: p.id,
    name: p.name,
    role: p.role,
    isCaptain: p.isCaptain
  });
  const homePlayers = match.homeTeam.players.map(toScorecardPlayer);
  const awayPlayers = match.awayTeam.players.map(toScorecardPlayer);

  const inningsForCard = match.innings.map((inn) => {
    const battingTeamId = inn.battingTeamId;
    const battingPlayers =
      battingTeamId === match.homeTeamId ? homePlayers : awayPlayers;
    const bowlingPlayers =
      battingTeamId === match.homeTeamId ? awayPlayers : homePlayers;
    const bowlingTeamId =
      battingTeamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;

    const ballsForCard: ScorecardBall[] = inn.balls.map((b) => ({
      id: b.id,
      strikerId: b.strikerId,
      nonStrikerId: b.nonStrikerId,
      bowlerId: b.bowlerId,
      outBatterId: b.outBatterId,
      fielderId: b.fielderId,
      runs: b.runs,
      extraType: b.extraType,
      extraRuns: b.extraRuns ?? 0,
      isWicket: b.isWicket,
      wicketType: b.wicketType,
      legal: b.legal,
      overNumber: b.overNumber,
      ballInOver: b.ballInOver
    }));

    return {
      inningsNumber: inn.number,
      totalRuns: inn.totalRuns,
      totalWickets: inn.totalWickets,
      totalBalls: inn.totalBalls,
      isClosed: inn.isClosed,
      isSuperOver: inn.isSuperOver,
      scorecard: buildInningsScorecard(
        ballsForCard,
        battingTeamId,
        bowlingTeamId,
        battingPlayers,
        bowlingPlayers
      )
    };
  });

  const allBallsForPoints: ScorecardBall[] = match.innings.flatMap((inn) =>
    inn.balls.map((b) => ({
      id: b.id,
      strikerId: b.strikerId,
      nonStrikerId: b.nonStrikerId,
      bowlerId: b.bowlerId,
      outBatterId: b.outBatterId,
      fielderId: b.fielderId,
      runs: b.runs,
      extraType: b.extraType,
      extraRuns: b.extraRuns ?? 0,
      isWicket: b.isWicket,
      wicketType: b.wicketType,
      legal: b.legal,
      overNumber: b.overNumber,
      ballInOver: b.ballInOver
    }))
  );
  const teamIdByPlayerId = new Map<string, string>();
  for (const p of match.homeTeam.players)
    teamIdByPlayerId.set(p.id, match.homeTeamId);
  for (const p of match.awayTeam.players)
    teamIdByPlayerId.set(p.id, match.awayTeamId);
  const pointsCfg = pointsConfig(match.overs);
  const matchPoints = computeMatchPoints(
    allBallsForPoints,
    [...homePlayers, ...awayPlayers],
    teamIdByPlayerId,
    pointsCfg
  );

  const currentInnings =
    match.innings.find((i) => !i.isClosed) ?? match.innings.at(-1);

  // Aggregate per-player batting/bowling stats for the current innings.
  const batters = new Map<string, BatterStat>();
  const bowlers = new Map<string, BowlerStat>();
  if (currentInnings) {
    for (const b of currentInnings.balls) {
      const offBat =
        b.extraType === "BYE" || b.extraType === "LEG_BYE" ? 0 : b.runs;
      const bat =
        batters.get(b.strikerId) ?? {
          id: b.strikerId,
          name: b.striker.name,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0
        };
      bat.runs += offBat;
      if (b.legal) bat.balls += 1;
      if (offBat === 4) bat.fours += 1;
      if (offBat === 6) bat.sixes += 1;
      batters.set(b.strikerId, bat);

      const bowl =
        bowlers.get(b.bowlerId) ?? {
          id: b.bowlerId,
          name: b.bowler.name,
          legalBalls: 0,
          runsConceded: 0,
          wickets: 0
        };
      if (b.legal) bowl.legalBalls += 1;
      const conceded =
        b.extraType === "BYE" || b.extraType === "LEG_BYE"
          ? 0
          : b.runs + (b.extraRuns ?? 0);
      bowl.runsConceded += conceded;
      if (b.isWicket && b.wicketType && b.wicketType !== "RUN_OUT") {
        bowl.wickets += 1;
      }
      bowlers.set(b.bowlerId, bowl);
    }
  }

  // Last ball gives us the current striker / non-striker / bowler.
  const lastBall = currentInnings?.balls.at(-1);
  const currentStriker = lastBall ? batters.get(lastBall.strikerId) : undefined;
  const currentNonStriker = lastBall
    ? batters.get(lastBall.nonStrikerId)
    : undefined;
  // If non-striker hasn't faced a ball yet they won't be in `batters` — fall back.
  const currentNonStrikerFallback = lastBall
    ? { id: lastBall.nonStrikerId, name: lastBall.nonStriker.name, runs: 0, balls: 0, fours: 0, sixes: 0 }
    : undefined;
  const nonStrikerCard = currentNonStriker ?? currentNonStrikerFallback;
  const currentBowler = lastBall ? bowlers.get(lastBall.bowlerId) : undefined;

  // Last 12 balls (newest last → newest left in UI)
  const lastBalls = currentInnings ? currentInnings.balls.slice(-12) : [];

  const battingTeam = currentInnings
    ? match.homeTeam.id === currentInnings.battingTeamId
      ? match.homeTeam
      : match.awayTeam
    : null;
  const bowlingTeam = currentInnings
    ? match.homeTeam.id === currentInnings.bowlingTeamId
      ? match.homeTeam
      : match.awayTeam
    : null;

  const homeInnings = match.innings.find(
    (i) => i.battingTeamId === match.homeTeamId
  );
  const awayInnings = match.innings.find(
    (i) => i.battingTeamId === match.awayTeamId
  );

  const isLive = match.status === "LIVE";
  const isCompleted = match.status === "COMPLETED";

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Mini header */}
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
          </Link>
          <Link
            href="/login"
            className="text-sm font-semibold text-brand-700 hover:underline"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 pb-24">
        {/* Title row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-500">
              {match.tournament.name}
              {match.venue ? ` • ${match.venue}` : ""}
            </p>
            <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
              {match.homeTeam.name} vs {match.awayTeam.name}
            </h1>
          </div>
          <span
            className={
              isLive
                ? "badge-live"
                : isCompleted
                ? "badge-completed"
                : "badge-upcoming"
            }
          >
            {match.status}
          </span>
        </div>

        {/* Hero scoreboard */}
        <section className="card overflow-hidden p-0">
          <div className="bg-gradient-to-br from-brand-700 to-brand-900 p-6 text-white">
            <div className="grid grid-cols-2 items-center gap-6">
              <TeamScore
                name={match.homeTeam.name}
                short={match.homeTeam.shortName}
                innings={homeInnings ?? null}
                isBatting={currentInnings?.battingTeamId === match.homeTeamId}
              />
              <TeamScore
                name={match.awayTeam.name}
                short={match.awayTeam.shortName}
                innings={awayInnings ?? null}
                isBatting={currentInnings?.battingTeamId === match.awayTeamId}
                alignRight
              />
            </div>

            {currentInnings && battingTeam && (
              <p className="mt-5 text-sm text-white/80">
                Innings {currentInnings.number} •{" "}
                <b className="text-white">{battingTeam.shortName}</b> batting
                {currentInnings.isSuperOver && (
                  <span className="ml-2 rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-950">
                    Super Over · 2× score
                  </span>
                )}
              </p>
            )}

            {match.resultText && (
              <p className="mt-4 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold">
                {match.resultText}
              </p>
            )}
          </div>

          {/* This-over balls */}
          {currentInnings && (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-ink-100 p-4">
              <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-ink-500">
                Last balls
              </span>
              {lastBalls.length === 0 && (
                <span className="text-xs text-ink-400">No balls yet.</span>
              )}
              {lastBalls.map((b) => (
                <BallPill
                  key={b.id}
                  runs={b.runs}
                  extraRuns={b.extraRuns ?? 0}
                  isWicket={b.isWicket}
                  extraType={b.extraType ?? null}
                />
              ))}
            </div>
          )}
        </section>

        {/* Current batters + bowler */}
        {currentInnings && (currentStriker || nonStrikerCard || currentBowler) && (
          <section className="grid gap-4 md:grid-cols-3">
            <PlayerCard
              title="Striker"
              name={currentStriker?.name ?? "—"}
              primary={`${currentStriker?.runs ?? 0}`}
              suffix={`(${currentStriker?.balls ?? 0})`}
              meta={
                currentStriker
                  ? `${currentStriker.fours}×4 · ${currentStriker.sixes}×6`
                  : ""
              }
              accent
            />
            <PlayerCard
              title="Non-striker"
              name={nonStrikerCard?.name ?? "—"}
              primary={`${nonStrikerCard?.runs ?? 0}`}
              suffix={`(${nonStrikerCard?.balls ?? 0})`}
              meta={
                nonStrikerCard
                  ? `${nonStrikerCard.fours}×4 · ${nonStrikerCard.sixes}×6`
                  : ""
              }
            />
            <PlayerCard
              title={`Bowler${
                bowlingTeam ? ` · ${bowlingTeam.shortName}` : ""
              }`}
              name={currentBowler?.name ?? "—"}
              primary={
                currentBowler
                  ? `${currentBowler.wickets}/${currentBowler.runsConceded}`
                  : "0/0"
              }
              suffix={
                currentBowler ? `(${formatOvers(currentBowler.legalBalls)} ov)` : ""
              }
              meta={
                currentBowler
                  ? `Econ ${
                      currentBowler.legalBalls > 0
                        ? (
                            (currentBowler.runsConceded /
                              (currentBowler.legalBalls / 6)) || 0
                          ).toFixed(2)
                        : "—"
                    }`
                  : ""
              }
            />
          </section>
        )}

        {/* Full team-tabbed scorecard */}
        {inningsForCard.length > 0 && (
          <MatchScorecard
            homeTeam={{
              id: match.homeTeamId,
              name: match.homeTeam.name,
              shortName: match.homeTeam.shortName
            }}
            awayTeam={{
              id: match.awayTeamId,
              name: match.awayTeam.name,
              shortName: match.awayTeam.shortName
            }}
            innings={inningsForCard}
          />
        )}

        {/* MVP + per-player points (visible after the match completes) */}
        {isCompleted && (
          <MvpPanel
            rows={matchPoints}
            config={pointsCfg}
            homeTeam={{
              id: match.homeTeamId,
              shortName: match.homeTeam.shortName
            }}
            awayTeam={{
              id: match.awayTeamId,
              shortName: match.awayTeam.shortName
            }}
          />
        )}

        {/* Innings breakdown */}
        {match.innings.length > 0 && (
          <section className="card p-5">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink-600">
              Innings breakdown
            </h2>
            <ul className="mt-3 space-y-1.5 text-sm">
              {match.innings.map((inn) => {
                const team =
                  inn.battingTeamId === match.homeTeamId
                    ? match.homeTeam
                    : match.awayTeam;
                return (
                  <li
                    key={inn.id}
                    className="flex items-baseline justify-between gap-3"
                  >
                    <span>
                      <b>Innings {inn.number}</b> · {team.name}
                      {inn.isSuperOver ? " · Super Over" : ""}
                      {inn.isClosed && (
                        <span className="ml-2 text-xs text-ink-500">closed</span>
                      )}
                    </span>
                    <span className="font-display font-bold">
                      {inn.totalRuns}/{inn.totalWickets}{" "}
                      <span className="font-medium text-ink-500">
                        ({formatOvers(inn.totalBalls)} ov)
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Hint */}
        {!isCompleted && (
          <p className="text-center text-xs text-ink-500">
            This page updates automatically every few seconds while the match is
            live. Share this link with anyone — no account needed.
          </p>
        )}
      </main>

      {/* Polls the RSC every 3s while live (down from 4s) so spectators
          see new balls almost immediately. */}
      {!isCompleted && <LiveAutoRefresh intervalMs={3000} />}
    </div>
  );
}

/* ------------------------- helpers ------------------------- */

function TeamScore({
  name,
  short,
  innings,
  isBatting,
  alignRight
}: {
  name: string;
  short: string;
  innings: {
    totalRuns: number;
    totalWickets: number;
    totalBalls: number;
  } | null;
  isBatting: boolean;
  alignRight?: boolean;
}) {
  return (
    <div className={alignRight ? "text-right" : ""}>
      <div className="flex items-center gap-2">
        {alignRight && isBatting && <BattingDot />}
        <p className="text-xs uppercase tracking-wider text-white/70">{short}</p>
        {!alignRight && isBatting && <BattingDot />}
      </div>
      <h2 className="font-display text-xl font-bold leading-tight sm:text-2xl">
        {name}
      </h2>
      {innings ? (
        <p className="mt-2 font-display text-4xl font-extrabold">
          {innings.totalRuns}
          <span className="text-2xl">/{innings.totalWickets}</span>
        </p>
      ) : (
        <p className="mt-2 font-display text-4xl font-extrabold text-white/40">
          —
        </p>
      )}
      <p className="text-xs text-white/70">
        {innings ? `${formatOvers(innings.totalBalls)} ov` : "yet to bat"}
      </p>
    </div>
  );
}

function BattingDot() {
  return (
    <span
      title="Batting now"
      className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-200"
    >
      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
      Batting
    </span>
  );
}

function BallPill({
  runs,
  extraRuns,
  isWicket,
  extraType
}: {
  runs: number;
  extraRuns: number;
  isWicket: boolean;
  extraType: string | null;
}) {
  const b = { runs, extraRuns, isWicket, extraType };
  return (
    <span
      className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-bold ${ballPillColor(
        b
      )}`}
    >
      {ballPillText(b)}
    </span>
  );
}

function PlayerCard({
  title,
  name,
  primary,
  suffix,
  meta,
  accent
}: {
  title: string;
  name: string;
  primary: string;
  suffix: string;
  meta: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`card p-4 ${
        accent ? "border-brand-200 bg-brand-50/30" : ""
      }`}
    >
      <p className="text-xs uppercase tracking-wider text-ink-500">{title}</p>
      <p className="mt-1 truncate font-display text-lg font-bold text-ink-900">
        {name}
      </p>
      <p className="mt-1 font-display text-2xl font-extrabold text-brand-700">
        {primary}{" "}
        <span className="text-sm font-semibold text-ink-500">{suffix}</span>
      </p>
      {meta && <p className="mt-0.5 text-xs text-ink-500">{meta}</p>}
    </div>
  );
}
