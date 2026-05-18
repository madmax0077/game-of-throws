import type { MatchPlayerPoints } from "@/lib/scorecard";

type TeamInfo = {
  id: string;
  shortName: string;
};

export function MvpPanel({
  rows,
  homeTeam,
  awayTeam
}: {
  rows: MatchPlayerPoints[];
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
}) {
  const participants = rows.filter((r) => r.participated);
  if (participants.length === 0) return null;

  const mvp = participants[0];

  const shortFor = (teamId: string | null) => {
    if (teamId === homeTeam.id) return homeTeam.shortName;
    if (teamId === awayTeam.id) return awayTeam.shortName;
    return "—";
  };

  return (
    <section className="card overflow-hidden p-0">
      <header className="border-b border-ink-100 p-5">
        <h2 className="font-display text-lg font-bold">Player of the match</h2>
        <p className="mt-1 text-xs text-ink-500">
          Points = runs + 25 x wickets + 8 x fielding dismissals + boundary bonuses.
        </p>
      </header>

      <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-400 font-display text-2xl font-extrabold text-amber-950 shadow">
            {mvp.player.name[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
              MVP
            </p>
            <p className="truncate font-display text-xl font-extrabold text-ink-900">
              {mvp.player.name}
              {mvp.player.isCaptain && (
                <span className="ml-2 rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                  Captain
                </span>
              )}
            </p>
            <p className="mt-0.5 text-xs text-ink-600">
              {shortFor(mvp.teamId)} •{" "}
              {mvp.runs > 0 || mvp.ballsFaced > 0
                ? `${mvp.runs} (${mvp.ballsFaced})`
                : ""}
              {mvp.wickets > 0
                ? `${mvp.runs > 0 || mvp.ballsFaced > 0 ? " • " : ""}${mvp.wickets}/${mvp.runsConceded} in ${
                    Math.floor(mvp.legalBallsBowled / 6)
                  }.${mvp.legalBallsBowled % 6} ov`
                : ""}
              {mvp.catches + mvp.runOuts + mvp.stumpings > 0
                ? ` • ${mvp.catches + mvp.runOuts + mvp.stumpings} fielding`
                : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-3xl font-extrabold text-ink-900 tabular-nums">
              {mvp.points}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-500">
              points
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-ink-500">
              <th className="px-5 py-2 font-semibold">#</th>
              <th className="px-2 py-2 font-semibold">Player</th>
              <th className="px-2 py-2 font-semibold">Team</th>
              <th className="px-2 py-2 text-right font-semibold">Bat</th>
              <th className="px-2 py-2 text-right font-semibold">Bowl</th>
              <th className="px-2 py-2 text-right font-semibold">Field</th>
              <th className="px-5 py-2 text-right font-semibold">Pts</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((r, i) => (
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
                  {r.ballsFaced > 0 || r.runs > 0
                    ? `${r.runs} (${r.ballsFaced})`
                    : "—"}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-ink-700">
                  {r.legalBallsBowled > 0
                    ? `${r.wickets}/${r.runsConceded}`
                    : "—"}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-ink-700">
                  {r.catches + r.runOuts + r.stumpings > 0
                    ? r.catches + r.runOuts + r.stumpings
                    : "—"}
                </td>
                <td className="px-5 py-2 text-right font-bold tabular-nums">
                  {r.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
