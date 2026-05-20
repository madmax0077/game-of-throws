"use client";

import { useState } from "react";
import type { InningsCommentary } from "@/lib/commentary";

type TeamInfo = {
  id: string;
  name: string;
  shortName: string;
};

/**
 * Cricinfo-style ball-by-ball commentary block. The user picks which
 * innings's commentary to look at via tabs at the top; we render that
 * innings with the latest over on top.
 *
 * Each over card shows the over header (X runs, end-of-over totals,
 * CRR/RRR if it's a chase), the two batters on the crease, the
 * bowler's overs-maidens-runs-wickets, and then every ball with the
 * scorebook pill + a short "Bowler to Batter, outcome" line. We
 * intentionally don't add narrative ("smashed to long-on") because the
 * scorer isn't typing free text — only stats are recorded.
 */
export function MatchCommentary({
  homeTeam,
  awayTeam,
  innings
}: {
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  innings: InningsCommentary[];
}) {
  const inningsWithBalls = innings.filter((i) => i.overs.length > 0);

  // Latest innings (highest number) is the most interesting by default;
  // we keep the hook call above any early return to satisfy React's
  // rules-of-hooks.
  const defaultInningsNumber =
    inningsWithBalls.length > 0
      ? inningsWithBalls[inningsWithBalls.length - 1].inningsNumber
      : 0;
  const [activeInningsNumber, setActiveInningsNumber] = useState<number>(
    defaultInningsNumber
  );

  if (inningsWithBalls.length === 0) return null;

  const active =
    inningsWithBalls.find((i) => i.inningsNumber === activeInningsNumber) ??
    inningsWithBalls[inningsWithBalls.length - 1];

  const teamOf = (teamId: string): TeamInfo =>
    teamId === homeTeam.id ? homeTeam : awayTeam;

  return (
    <section className="card overflow-hidden p-0">
      <header className="border-b border-ink-100 p-5">
        <h2 className="font-display text-lg font-bold">Commentary</h2>
        <p className="mt-1 text-xs text-ink-500">
          Ball-by-ball, latest over on top. Tap an innings to switch.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {inningsWithBalls.map((inn) => {
            const team = teamOf(inn.battingTeamId);
            const active = activeInningsNumber === inn.inningsNumber;
            return (
              <button
                key={inn.inningsNumber}
                type="button"
                onClick={() => setActiveInningsNumber(inn.inningsNumber)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                  active
                    ? "bg-ink-900 text-white"
                    : "bg-ink-100 text-ink-700 hover:bg-ink-200"
                }`}
              >
                Innings {inn.inningsNumber} · {team.shortName}
                {inn.isSuperOver && " · SO"}
              </button>
            );
          })}
        </div>
      </header>

      <div className="divide-y divide-ink-100">
        {active.overs.map((over) => (
          <OverBlock
            key={over.overNumber}
            over={over}
            battingTeam={teamOf(active.battingTeamId)}
            bowlingTeam={teamOf(active.bowlingTeamId)}
            isChase={active.target !== null}
          />
        ))}
      </div>
    </section>
  );
}

function OverBlock({
  over,
  battingTeam,
  bowlingTeam,
  isChase
}: {
  over: InningsCommentary["overs"][number];
  battingTeam: TeamInfo;
  bowlingTeam: TeamInfo;
  isChase: boolean;
}) {
  return (
    <div className="p-5">
      {/* Over header: runs in over, totals, rates */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-ink-500">
            Over
          </p>
          <p className="font-display text-2xl font-extrabold text-ink-900">
            {over.overNumber}
            <span className="ml-2 align-middle text-sm font-bold text-ink-500">
              {over.runsInOver} run{over.runsInOver === 1 ? "" : "s"}
            </span>
          </p>
        </div>
        <div className="text-right">
          {isChase && over.needRuns !== null && over.needBalls !== null ? (
            over.needRuns > 0 ? (
              <p className="text-sm font-bold text-brand-700">
                Need {over.needRuns} run{over.needRuns === 1 ? "" : "s"} from{" "}
                {over.needBalls}b
              </p>
            ) : (
              <p className="text-sm font-bold text-emerald-700">
                Target reached
              </p>
            )
          ) : null}
          <p className="text-sm font-semibold text-ink-900">
            {battingTeam.shortName} {over.endTotalRuns}/{over.endTotalWickets}
          </p>
          <p className="text-[11px] text-ink-500">
            CRR {over.crr.toFixed(2)}
            {isChase && over.rrr !== null && (
              <span> · RRR {over.rrr.toFixed(2)}</span>
            )}
          </p>
        </div>
      </div>

      {/* Batters + bowler mini-cards */}
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {over.battersOnCrease.map((bat, i) => (
          <div
            key={`${bat.id}-${i}`}
            className="rounded-lg border border-ink-100 bg-ink-50/40 px-3 py-2"
          >
            <p className="truncate text-sm font-bold text-ink-900">
              {bat.name}
              {bat.notOut && (
                <span className="ml-1 text-emerald-700">*</span>
              )}
            </p>
            <p className="text-xs text-ink-600 tabular-nums">
              {bat.runs} ({bat.ballsFaced}b
              {bat.fours > 0 && ` ${bat.fours}×4`}
              {bat.sixes > 0 && ` ${bat.sixes}×6`})
            </p>
          </div>
        ))}
        <div className="rounded-lg border border-ink-100 bg-ink-50/40 px-3 py-2">
          <p className="truncate text-sm font-bold text-ink-900">
            {over.bowler.name}
            <span className="ml-1 text-[10px] uppercase tracking-wider text-ink-500">
              {bowlingTeam.shortName}
            </span>
          </p>
          <p className="text-xs text-ink-600 tabular-nums">
            {over.bowler.oversText}-{over.bowler.maidens}-
            {over.bowler.runsConceded}-{over.bowler.wickets}
          </p>
        </div>
      </div>

      {/* Per-ball list — latest first within the over */}
      <ul className="mt-4 space-y-2">
        {over.balls
          .slice()
          .reverse()
          .map((b) => (
            <li
              key={b.id}
              className={`flex items-start gap-3 rounded-lg px-3 py-2 ${
                b.isWicket
                  ? "border border-ink-300 bg-ink-900/[.03]"
                  : b.isSix
                  ? "bg-emerald-50/60"
                  : b.isFour
                  ? "bg-amber-50/60"
                  : "bg-white"
              }`}
            >
              <span className="w-12 shrink-0 text-xs font-semibold text-ink-500 tabular-nums">
                {b.label}
              </span>
              <span
                className={`inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${b.pillClass}`}
              >
                {b.pill}
              </span>
              <span className="text-sm leading-snug text-ink-800">
                {b.text}
              </span>
            </li>
          ))}
      </ul>
    </div>
  );
}
