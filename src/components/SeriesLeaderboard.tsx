import type { SeriesPlayerRow } from "@/lib/scorecard";

type TeamInfo = {
  id: string;
  shortName: string;
};

export function SeriesLeaderboard({
  rows,
  teams,
  matchesPlayed
}: {
  rows: SeriesPlayerRow[];
  teams: TeamInfo[];
  matchesPlayed: number; // completed matches counted into the totals
}) {
  if (rows.length === 0 || matchesPlayed === 0) {
    return (
      <section className="card p-6">
        <h2 className="font-display text-lg font-bold">
          Player of the series
        </h2>
        <p className="mt-2 text-sm text-ink-500">
          Once matches are completed, the player rankings — summed across every
          completed fixture — will show up here. The leader takes the Player of
          the Series.
        </p>
      </section>
    );
  }

  const top = rows[0];
  const shortFor = (teamId: string | null) =>
    teamId ? teams.find((t) => t.id === teamId)?.shortName ?? "—" : "—";

  return (
    <section className="card overflow-hidden p-0">
      <header className="border-b border-ink-100 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-bold">
            Player of the series
          </h2>
          <p className="text-xs text-ink-500">
            Sum of Dream11-style points across{" "}
            <span className="font-semibold">{matchesPlayed}</span> completed{" "}
            {matchesPlayed === 1 ? "match" : "matches"}. Each match is scored
            in its own format-appropriate scheme.
          </p>
        </div>
      </header>

      {/* Series leader card */}
      <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-400 font-display text-2xl font-extrabold text-amber-950 shadow">
            {top.player.name[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
              Series leader
            </p>
            <p className="truncate font-display text-xl font-extrabold text-ink-900">
              {top.player.name}
              {top.player.isCaptain && (
                <span className="ml-2 rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                  Captain
                </span>
              )}
            </p>
            <p className="mt-0.5 text-xs text-ink-600">
              {shortFor(top.teamId)} • {top.matchesPlayed}{" "}
              {top.matchesPlayed === 1 ? "match" : "matches"}
              {top.runs > 0 ? ` • ${top.runs} runs` : ""}
              {top.wickets > 0 ? ` • ${top.wickets} wkts` : ""}
              {top.catches + top.runOuts + top.stumpings > 0
                ? ` • ${top.catches + top.runOuts + top.stumpings} fielding`
                : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-3xl font-extrabold text-ink-900 tabular-nums">
              {top.totalPoints}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-500">
              total pts
            </p>
          </div>
        </div>
      </div>

      {/* Full standings */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-ink-500">
              <th className="px-5 py-2 font-semibold">#</th>
              <th className="px-2 py-2 font-semibold">Player</th>
              <th className="px-2 py-2 font-semibold">Team</th>
              <th className="px-2 py-2 text-right font-semibold">M</th>
              <th className="px-2 py-2 text-right font-semibold">Runs</th>
              <th className="px-2 py-2 text-right font-semibold">Wkts</th>
              <th className="px-2 py-2 text-right font-semibold">Field</th>
              <th className="px-5 py-2 text-right font-semibold">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.player.id}
                className={`border-t border-ink-100 ${
                  i === 0 ? "bg-amber-50/40" : ""
                }`}
              >
                <td className="px-5 py-2 text-xs font-bold text-ink-500 tabular-nums">
                  {i + 1}
                </td>
                <td className="px-2 py-2">
                  <span className="font-semibold text-ink-900">
                    {r.player.name}
                  </span>
                  {r.player.isCaptain && (
                    <span className="ml-1.5 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-800">
                      C
                    </span>
                  )}
                </td>
                <td className="px-2 py-2 text-xs text-ink-600">
                  {shortFor(r.teamId)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-ink-700">
                  {r.matchesPlayed}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-ink-700">
                  {r.ballsFaced > 0 || r.runs > 0
                    ? `${r.runs} (${r.ballsFaced})`
                    : "—"}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-ink-700">
                  {r.legalBallsBowled > 0 || r.wickets > 0
                    ? `${r.wickets}/${r.runsConceded}`
                    : "—"}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-ink-700">
                  {r.catches + r.runOuts + r.stumpings > 0
                    ? r.catches + r.runOuts + r.stumpings
                    : "—"}
                </td>
                <td className="px-5 py-2 text-right font-bold tabular-nums">
                  {r.totalPoints}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
