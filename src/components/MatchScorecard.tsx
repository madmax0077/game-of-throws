"use client";

import { useState } from "react";
import type { InningsScorecard } from "@/lib/scorecard";
import { isDedicatedSuperOverInnings } from "@/lib/inningsRules";

type TeamInfo = {
  id: string;
  name: string;
  shortName: string;
};

export function MatchScorecard({
  homeTeam,
  awayTeam,
  innings
}: {
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  // One entry per innings, in order. Each carries which team batted.
  innings: Array<{
    inningsNumber: number;
    totalRuns: number;
    totalWickets: number;
    totalBalls: number;
    isClosed: boolean;
    isSuperOver: boolean;
    scorecard: InningsScorecard;
  }>;
}) {
  // Pick the first innings whose batting side is the selected team. We let
  // the user toggle which team's batting card they see; the bowling card
  // shown next to it is automatically the *opposite* team.
  const teamsWithInnings = [homeTeam, awayTeam].filter((t) =>
    innings.some((i) => i.scorecard.battingTeamId === t.id)
  );
  const initialTeam = teamsWithInnings[0]?.id ?? homeTeam.id;
  const [activeTeamId, setActiveTeamId] = useState<string>(initialTeam);

  // All innings where the active team is batting. (Usually exactly one in
  // limited-overs cricket, but if super-overs add more we render them all.)
  const battingInningsForTeam = innings.filter(
    (i) => i.scorecard.battingTeamId === activeTeamId
  );

  if (battingInningsForTeam.length === 0) {
    return null;
  }

  return (
    <section className="card overflow-hidden p-0">
      <header className="border-b border-ink-100 p-5">
        <h2 className="font-display text-lg font-bold">Scorecard</h2>
        <p className="mt-1 text-xs text-ink-500">
          Tap a team to see their batters and the opposition&apos;s bowlers.
        </p>
        <div className="mt-3 inline-flex rounded-lg bg-ink-100 p-1">
          {[homeTeam, awayTeam].map((t) => {
            const has = innings.some((i) => i.scorecard.battingTeamId === t.id);
            const active = activeTeamId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => has && setActiveTeamId(t.id)}
                disabled={!has}
                className={`rounded-md px-3 py-1.5 text-sm font-bold transition ${
                  active
                    ? "bg-white text-ink-900 shadow"
                    : has
                    ? "text-ink-600 hover:text-ink-900"
                    : "cursor-not-allowed text-ink-300"
                }`}
              >
                {t.shortName}
              </button>
            );
          })}
        </div>
      </header>

      <div className="divide-y divide-ink-100">
        {battingInningsForTeam.map((inn) => (
          <InningsBlock key={inn.inningsNumber} inn={inn} />
        ))}
      </div>
    </section>
  );
}

function InningsBlock({
  inn
}: {
  inn: {
    inningsNumber: number;
    totalRuns: number;
    totalWickets: number;
    totalBalls: number;
    isClosed: boolean;
    isSuperOver: boolean;
    scorecard: InningsScorecard;
  };
}) {
  const overs = Math.floor(inn.totalBalls / 6);
  const rem = inn.totalBalls % 6;
  const oversText = `${overs}.${rem}`;
  return (
    <div className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-base font-bold">
          Innings {inn.inningsNumber}
          {isDedicatedSuperOverInnings({
            isSuperOver: inn.isSuperOver,
            number: inn.inningsNumber
          }) && (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
              Super over
            </span>
          )}
        </h3>
        <p className="font-display text-sm font-bold text-ink-700">
          {inn.totalRuns}/{inn.totalWickets}{" "}
          <span className="text-ink-500">({oversText} ov)</span>
          {inn.isClosed && (
            <span className="ml-2 rounded bg-ink-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-600">
              Closed
            </span>
          )}
        </p>
      </div>

      {/* Batting */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-ink-500">
              <th className="py-2 pr-3 font-semibold">Batter</th>
              <th className="px-2 py-2 text-right font-semibold">R</th>
              <th className="px-2 py-2 text-right font-semibold">B</th>
              <th className="px-2 py-2 text-right font-semibold">4s</th>
              <th className="px-2 py-2 text-right font-semibold">6s</th>
              <th className="py-2 pl-2 text-right font-semibold">SR</th>
            </tr>
          </thead>
          <tbody>
            {inn.scorecard.batters
              .filter((b) => b.didBat)
              .map((b) => (
                <tr key={b.player.id} className="border-t border-ink-100">
                  <td className="py-2 pr-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-ink-900">
                        {b.player.name}
                      </span>
                      {b.player.isCaptain && (
                        <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-800">
                          C
                        </span>
                      )}
                      {b.outInfo === null && (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                          not out
                        </span>
                      )}
                    </div>
                    {b.outInfo && (
                      <p className="mt-0.5 text-xs text-ink-500">{b.outInfo}</p>
                    )}
                  </td>
                  <td className="px-2 py-2 text-right font-bold tabular-nums">
                    {b.runs}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-ink-700">
                    {b.ballsFaced}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-ink-700">
                    {b.fours}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-ink-700">
                    {b.sixes}
                  </td>
                  <td className="py-2 pl-2 text-right tabular-nums text-ink-700">
                    {b.strikeRate.toFixed(1)}
                  </td>
                </tr>
              ))}
            {inn.scorecard.batters.every((b) => !b.didBat) && (
              <tr>
                <td colSpan={6} className="py-3 text-center text-xs text-ink-500">
                  No balls scored yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Did not bat */}
      {inn.scorecard.batters.some((b) => !b.didBat) && (
        <p className="mt-3 text-xs text-ink-500">
          <span className="font-semibold text-ink-600">Did not bat:</span>{" "}
          {inn.scorecard.batters
            .filter((b) => !b.didBat)
            .map((b) => b.player.name)
            .join(", ")}
        </p>
      )}

      {/* Extras */}
      <p className="mt-3 text-xs text-ink-600">
        <span className="font-semibold">Extras:</span>{" "}
        {inn.scorecard.extras.total} (Wd {inn.scorecard.extras.wides}, Nb{" "}
        {inn.scorecard.extras.noBalls}, B {inn.scorecard.extras.byes}, Lb{" "}
        {inn.scorecard.extras.legByes}
        {inn.scorecard.extras.penalty > 0
          ? `, P ${inn.scorecard.extras.penalty}`
          : ""}
        )
      </p>

      {/* Bowling */}
      <div className="mt-5 overflow-x-auto">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">
          Bowling
        </p>
        <table className="mt-2 w-full min-w-[520px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-ink-500">
              <th className="py-2 pr-3 font-semibold">Bowler</th>
              <th className="px-2 py-2 text-right font-semibold">O</th>
              <th className="px-2 py-2 text-right font-semibold">M</th>
              <th className="px-2 py-2 text-right font-semibold">R</th>
              <th className="px-2 py-2 text-right font-semibold">W</th>
              <th className="px-2 py-2 text-right font-semibold">Econ</th>
              <th className="py-2 pl-2 text-right font-semibold">Wd/Nb</th>
            </tr>
          </thead>
          <tbody>
            {inn.scorecard.bowlers.map((b) => (
              <tr key={b.player.id} className="border-t border-ink-100">
                <td className="py-2 pr-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-ink-900">
                      {b.player.name}
                    </span>
                    {b.player.isCaptain && (
                      <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-800">
                        C
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-ink-700">
                  {b.oversText}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-ink-700">
                  {b.maidens}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-ink-700">
                  {b.runsConceded}
                </td>
                <td className="px-2 py-2 text-right font-bold tabular-nums">
                  {b.wickets}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-ink-700">
                  {b.economy.toFixed(2)}
                </td>
                <td className="py-2 pl-2 text-right tabular-nums text-ink-700">
                  {b.wides}/{b.noBalls}
                </td>
              </tr>
            ))}
            {inn.scorecard.bowlers.length === 0 && (
              <tr>
                <td colSpan={7} className="py-3 text-center text-xs text-ink-500">
                  No bowlers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
