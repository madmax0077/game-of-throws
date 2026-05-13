"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatOvers } from "@/lib/utils";

type Player = { id: string; name: string };
type Team = { id: string; name: string; shortName: string; players: Player[] };
type RecentBall = {
  id: string;
  runs: number;
  extraType: string | null;
  extraRuns: number;
  isWicket: boolean;
  legal: boolean;
};
type Innings = {
  id: string;
  number: number;
  battingTeamId: string;
  bowlingTeamId: string;
  totalRuns: number;
  totalWickets: number;
  totalBalls: number;
  isClosed: boolean;
  isSuperOver: boolean;
  dismissedBatterIds: string[];
  previousOverBowlerId: string | null;
  recentBalls: RecentBall[];
};
type Match = {
  id: string;
  overs: number;
  status: string;
  resultText: string | null;
  homeTeam: Team;
  awayTeam: Team;
  innings: Innings[];
};

const WICKET_TYPES = [
  { value: "BOWLED", label: "Bowled" },
  { value: "CAUGHT", label: "Caught" },
  { value: "LBW", label: "LBW" },
  { value: "RUN_OUT", label: "Run out" },
  { value: "STUMPED", label: "Stumped" },
  { value: "HIT_WICKET", label: "Hit wicket" }
];

export function ScoreEntry({ match }: { match: Match }) {
  const router = useRouter();
  const currentInnings = match.innings.find((i) => !i.isClosed);

  if (!currentInnings) {
    // Match is complete when both teams have at least one CLOSED innings.
    const homeClosed = match.innings.some(
      (i) => i.isClosed && i.battingTeamId === match.homeTeam.id
    );
    const awayClosed = match.innings.some(
      (i) => i.isClosed && i.battingTeamId === match.awayTeam.id
    );
    if (homeClosed && awayClosed) {
      return <MatchResult match={match} />;
    }
    return <InningsStarter match={match} onStarted={() => router.refresh()} />;
  }

  return <BallByBall match={match} innings={currentInnings} />;
}

/* -------------------- Match result -------------------- */

// Server gives us strings like "MUM won by 7 wickets", "CHE won by 12 runs"
// or "Match tied". Split into a bold headline ("MUM won") and a soft
// subhead ("by 7 wickets") so the result card reads nicely.
function splitResult(text: string): { headline: string; subhead: string } {
  if (/^match tied/i.test(text)) {
    return { headline: "Match tied", subhead: "Both teams finished on equal scores" };
  }
  const m = text.match(/^(.*?\bwon)\s+(by\s+.+)$/i);
  if (m) return { headline: m[1], subhead: m[2] };
  return { headline: text, subhead: "" };
}

function MatchResult({ match }: { match: Match }) {
  const totalsByTeam = (teamId: string) =>
    match.innings
      .filter((i) => i.isClosed && i.battingTeamId === teamId)
      .reduce(
        (acc, i) => ({
          runs: acc.runs + i.totalRuns,
          wickets: acc.wickets + i.totalWickets,
          balls: acc.balls + i.totalBalls
        }),
        { runs: 0, wickets: 0, balls: 0 }
      );

  const home = totalsByTeam(match.homeTeam.id);
  const away = totalsByTeam(match.awayTeam.id);

  // Prefer the server-computed result string when present — it knows the
  // correct cricket convention ("by N wickets" for a chase win) which we
  // can't easily reproduce on the client without team squad sizes.
  let headline: string;
  let subhead: string;
  const parsed = match.resultText ? splitResult(match.resultText) : null;
  if (parsed) {
    headline = parsed.headline;
    subhead = parsed.subhead;
  } else if (home.runs > away.runs) {
    headline = `${match.homeTeam.name} won`;
    subhead = `by ${home.runs - away.runs} runs`;
  } else if (away.runs > home.runs) {
    headline = `${match.awayTeam.name} won`;
    subhead = `by ${away.runs - home.runs} runs`;
  } else {
    headline = "Match tied";
    subhead = "Both teams finished on equal scores";
  }

  return (
    <div className="space-y-4">
      <Link href={`/matches/${match.id}`} className="text-sm text-brand-700 hover:underline">
        ← Back to match
      </Link>

      <div className="card overflow-hidden p-0">
        <div className="bg-gradient-to-br from-brand-700 to-brand-900 p-8 text-center text-white">
          <p className="text-xs uppercase tracking-[0.2em] text-white/70">
            Result
          </p>
          <h1 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">
            {headline}
          </h1>
          <p className="mt-2 text-base text-white/90">{subhead}</p>
        </div>

        <div className="grid grid-cols-1 divide-y divide-ink-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <TeamFinal
            name={match.homeTeam.name}
            short={match.homeTeam.shortName}
            t={home}
            winner={home.runs > away.runs}
          />
          <TeamFinal
            name={match.awayTeam.name}
            short={match.awayTeam.shortName}
            t={away}
            winner={away.runs > home.runs}
          />
        </div>
      </div>

      {match.innings.length > 0 && (
        <div className="card p-5">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink-600">
            Innings breakdown
          </h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            {match.innings.map((inn) => {
              const team =
                inn.battingTeamId === match.homeTeam.id
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
        </div>
      )}
    </div>
  );
}

function TeamFinal({
  name,
  short,
  t,
  winner
}: {
  name: string;
  short: string;
  t: { runs: number; wickets: number; balls: number };
  winner: boolean;
}) {
  return (
    <div className={`p-6 text-center ${winner ? "bg-emerald-50/50" : ""}`}>
      <p className="text-xs uppercase tracking-wider text-ink-500">{short}</p>
      <p className="mt-1 font-display text-lg font-bold">{name}</p>
      <p
        className={`mt-3 font-display text-4xl font-extrabold ${
          winner ? "text-emerald-700" : "text-ink-900"
        }`}
      >
        {t.runs}
        <span className="text-2xl">/{t.wickets}</span>
      </p>
      <p className="mt-1 text-xs text-ink-500">{formatOvers(t.balls)} overs</p>
    </div>
  );
}

/* -------------------- Start a new innings -------------------- */

function InningsStarter({
  match,
  onStarted
}: {
  match: Match;
  onStarted: () => void;
}) {
  const previousInnings = match.innings.filter((i) => i.isClosed);
  const nextNumber = previousInnings.length + 1;

  // Each team bats only once. The teams that have ALREADY batted are off-limits;
  // only the remaining team(s) can be selected for the next innings.
  const teamsAlreadyBatted = new Set(
    match.innings.map((i) => i.battingTeamId)
  );
  const allTeams = [match.homeTeam, match.awayTeam];
  const availableTeams = allTeams.filter((t) => !teamsAlreadyBatted.has(t.id));
  const lockedTeam =
    availableTeams.length === 1 ? availableTeams[0] : null;

  const [battingTeamId, setBattingTeamId] = useState<string>(
    availableTeams[0]?.id ?? ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setSubmitting(true);
    setError(null);
    const bowlingTeamId =
      battingTeamId === match.homeTeam.id ? match.awayTeam.id : match.homeTeam.id;
    const res = await fetch(`/api/matches/${match.id}/innings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        number: nextNumber,
        battingTeamId,
        bowlingTeamId
      })
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not start innings.");
      return;
    }
    onStarted();
  }

  return (
    <div className="max-w-xl space-y-4">
      <Link href={`/matches/${match.id}`} className="text-sm text-brand-700 hover:underline">
        ← Back to match
      </Link>

      {previousInnings.length > 0 && (
        <div className="card border-emerald-200 bg-emerald-50/50 p-5">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-800">
            Innings complete
          </p>
          <ul className="mt-2 space-y-1">
            {previousInnings.map((inn) => {
              const team =
                inn.battingTeamId === match.homeTeam.id
                  ? match.homeTeam
                  : match.awayTeam;
              return (
                <li
                  key={inn.id}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <span>
                    <b>Innings {inn.number}</b> · {team.name}
                    {inn.isSuperOver ? " · Super Over" : ""}
                  </span>
                  <span className="font-display font-bold text-emerald-900">
                    {inn.totalRuns}/{inn.totalWickets}{" "}
                    <span className="font-medium text-emerald-700">
                      ({formatOvers(inn.totalBalls)} ov)
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="card p-6">
        <h1 className="font-display text-xl font-bold">
          Start innings {nextNumber}
        </h1>
        <p className="mt-1 text-sm text-ink-600">
          {lockedTeam
            ? `${lockedTeam.name} hasn't batted yet — they bat this innings.`
            : "Choose the team that's batting first this innings."}
        </p>

        {lockedTeam ? (
          <div className="mt-5 rounded-xl border border-brand-700 bg-brand-50 p-4">
            <p className="text-xs uppercase tracking-wider text-brand-700">
              Batting this innings
            </p>
            <p className="mt-1 font-display text-lg font-bold">
              {lockedTeam.name}
            </p>
            <p className="text-xs text-ink-600">
              {allTeams
                .filter((t) => t.id !== lockedTeam.id)
                .map((t) => t.name)
                .join(", ")}{" "}
              has already batted in this match.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {availableTeams.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setBattingTeamId(t.id)}
                className={`rounded-xl border p-4 text-left transition ${
                  battingTeamId === t.id
                    ? "border-brand-700 bg-brand-50"
                    : "border-ink-200 hover:border-brand-200"
                }`}
              >
                <p className="font-display font-bold">{t.name}</p>
                <p className="text-xs text-ink-500">Bats first</p>
              </button>
            ))}
          </div>
        )}

        <p className="mt-5 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-600">
          You can enable <b>Super Over</b> from the scoring board once the
          innings starts (only at the beginning of an over).
        </p>

        {error && (
          <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
            {error}
          </p>
        )}

        <button
          onClick={start}
          disabled={submitting || !battingTeamId}
          className="btn-primary mt-5 w-full"
        >
          {submitting ? "Starting..." : "Start innings"}
        </button>
      </div>
    </div>
  );
}

/* -------------------- Ball-by-ball entry -------------------- */

function BallByBall({ match, innings }: { match: Match; innings: Innings }) {
  const router = useRouter();
  const battingTeam =
    match.homeTeam.id === innings.battingTeamId ? match.homeTeam : match.awayTeam;
  const bowlingTeam =
    match.homeTeam.id === innings.bowlingTeamId ? match.homeTeam : match.awayTeam;

  const [strikerId, setStrikerId] = useState<string>(battingTeam.players[0]?.id ?? "");
  const [nonStrikerId, setNonStrikerId] = useState<string>(battingTeam.players[1]?.id ?? "");
  const [bowlerId, setBowlerId] = useState<string>(bowlingTeam.players[0]?.id ?? "");
  const [extraType, setExtraType] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [overEndedBanner, setOverEndedBanner] = useState<{ overNumber: number } | null>(null);

  // Wicket-mode state
  const [wicketMode, setWicketMode] = useState(false);
  const [wicketType, setWicketType] = useState("BOWLED");
  const [outBatterEnd, setOutBatterEnd] = useState<"STRIKER" | "NON_STRIKER">("STRIKER");
  const [newBatterId, setNewBatterId] = useState("");
  const [wicketRuns, setWicketRuns] = useState(0);
  const [fielderId, setFielderId] = useState("");

  // Catch / run-out / stumping all need a fielder credited.
  const fielderRequired =
    wicketType === "CAUGHT" || wicketType === "RUN_OUT" || wicketType === "STUMPED";
  // Label for the dropdown adapts to the dismissal type.
  const fielderLabel =
    wicketType === "CAUGHT"
      ? "Caught by"
      : wicketType === "STUMPED"
      ? "Stumped by"
      : "Run out by";

  const overStr = useMemo(() => formatOvers(innings.totalBalls), [innings.totalBalls]);

  // True when we're between overs: an over just completed and the next has
  // not yet started. The previous over's bowler cannot bowl again here.
  const atOverBoundary = innings.totalBalls > 0 && innings.totalBalls % 6 === 0;

  // Super-over toggle is only allowed at the start of an over: either before
  // any ball is bowled or once a full over has just completed.
  const canToggleSuperOver = innings.totalBalls === 0 || atOverBoundary;

  async function toggleSuperOver() {
    if (!canToggleSuperOver || busy) return;
    setBusy(true);
    const res = await fetch(
      `/api/matches/${match.id}/innings/${innings.id}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isSuperOver: !innings.isSuperOver })
      }
    );
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Could not toggle Super Over.");
      return;
    }
    router.refresh();
  }

  // Eligible incoming batters = team players minus current pair minus already-dismissed.
  const availableNewBatters = useMemo(() => {
    const excluded = new Set<string>([
      strikerId,
      nonStrikerId,
      ...innings.dismissedBatterIds
    ]);
    return battingTeam.players.filter((p) => !excluded.has(p.id));
  }, [battingTeam.players, strikerId, nonStrikerId, innings.dismissedBatterIds]);

  /* ----- Core ball recorder. Used by both normal runs and wicket flow. ----- */
  async function postBall(opts: {
    runs: number;
    isWicket: boolean;
    wicketType?: string | null;
    outBatterId?: string | null;
    fielderId?: string | null;
  }): Promise<boolean> {
    if (!strikerId || !nonStrikerId || !bowlerId) {
      alert("Please select striker, non-striker and bowler.");
      return false;
    }
    if (strikerId === nonStrikerId) {
      alert("Striker and non-striker must be different.");
      return false;
    }

    setBusy(true);
    setOverEndedBanner(null);

    const wasLegal =
      !extraType || extraType === "BYE" || extraType === "LEG_BYE";
    const legalBallsBefore = innings.totalBalls;
    const legalBallsAfter = legalBallsBefore + (wasLegal ? 1 : 0);
    const overJustEnded = wasLegal && legalBallsAfter > 0 && legalBallsAfter % 6 === 0;
    const completedOverNumber = Math.floor(legalBallsAfter / 6);

    // Split the click value into "runs to batter" vs "runs to extras":
    //   - BYE / LEG_BYE  → 0 to batter, the full clicked value goes to extras
    //                      (cricket rule: byes/leg-byes never credit the batter)
    //   - WIDE / NO_BALL → +1 penalty into extras; any clicked runs stay with
    //                      the batter (a runs-off-bat-on-a-no-ball is legitimate)
    //   - No extra       → all runs to batter, no extras
    const isByeOrLegBye = extraType === "BYE" || extraType === "LEG_BYE";
    const runsToBatter = isByeOrLegBye ? 0 : opts.runs;
    const extraRuns = isByeOrLegBye ? opts.runs : extraType ? 1 : 0;

    const body = {
      strikerId,
      nonStrikerId,
      bowlerId,
      runs: runsToBatter,
      extraType,
      extraRuns,
      isWicket: opts.isWicket,
      wicketType: opts.wicketType ?? null,
      outBatterId: opts.outBatterId ?? null,
      fielderId: opts.fielderId ?? null,
      legal: wasLegal
    };

    const res = await fetch(`/api/matches/${match.id}/innings/${innings.id}/balls`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Failed to record ball.");
      return false;
    }

    // Cricket strike-rotation rule:
    //   swap on odd runs (running between wickets ends with batters crossed)
    //   swap at end of over (batters change ends between overs)
    //   both at once = no net swap
    const oddRuns = opts.runs % 2 === 1;
    const shouldSwap = oddRuns !== overJustEnded;
    if (shouldSwap) {
      const oldStriker = strikerId;
      setStrikerId(nonStrikerId);
      setNonStrikerId(oldStriker);
    }

    if (overJustEnded) {
      setOverEndedBanner({ overNumber: completedOverNumber });
      // Same bowler can't bowl two overs in a row — force a re-selection.
      setBowlerId("");
    }
    // NOTE: bowler is NEVER reset on a wicket; only on over completion.

    setExtraType(null);
    return true;
  }

  /* ----- Normal run button ----- */
  async function recordRuns(runs: number) {
    const ok = await postBall({ runs, isWicket: false });
    if (ok) router.refresh();
  }

  /* ----- Confirm a wicket from the wicket panel ----- */
  async function confirmWicket() {
    // If there are no more batters in the squad, this wicket is the last one:
    // confirming it should still be allowed (API closes the innings on all-out).
    const isLastWicket = availableNewBatters.length === 0;
    if (!isLastWicket && !newBatterId) {
      alert("Please select the new incoming batter.");
      return;
    }
    if (fielderRequired && !fielderId) {
      alert(`Please select the ${fielderLabel.toLowerCase()} fielder.`);
      return;
    }
    const outId = outBatterEnd === "STRIKER" ? strikerId : nonStrikerId;
    const ok = await postBall({
      runs: wicketRuns,
      isWicket: true,
      wicketType,
      outBatterId: outId,
      fielderId: fielderRequired ? fielderId : null
    });
    if (!ok) return;

    if (!isLastWicket) {
      // After postBall has already applied odd-runs/over-end swaps, slot the new
      // batter into whichever end the out batter occupied. Because postBall has
      // already updated state (possibly swapping), we re-derive based on what's
      // current in the closure values — but we want the FINAL state. Easiest:
      // compute the post-swap positions ourselves.
      const oddRuns = wicketRuns % 2 === 1;
      const wasLegal =
        !extraType || extraType === "BYE" || extraType === "LEG_BYE";
      const legalBallsAfter = innings.totalBalls + (wasLegal ? 1 : 0);
      const overJustEnded =
        wasLegal && legalBallsAfter > 0 && legalBallsAfter % 6 === 0;
      const swappedByLogic = oddRuns !== overJustEnded;

      // Determine where the out batter ended up after the auto-swap:
      //   if no swap and out=STRIKER  -> striker slot needs replacement
      //   if no swap and out=NON_STRIKER -> non-striker slot needs replacement
      //   if swap and out=STRIKER     -> they're now at non-striker slot (post-swap)
      //   if swap and out=NON_STRIKER -> they're now at striker slot
      const outNowAtStriker =
        (outBatterEnd === "STRIKER" && !swappedByLogic) ||
        (outBatterEnd === "NON_STRIKER" && swappedByLogic);

      if (outNowAtStriker) {
        setStrikerId(newBatterId);
      } else {
        setNonStrikerId(newBatterId);
      }
    }

    // Reset wicket-panel state
    setWicketMode(false);
    setWicketType("BOWLED");
    setOutBatterEnd("STRIKER");
    setNewBatterId("");
    setWicketRuns(0);
    setFielderId("");

    router.refresh();
  }

  async function undoLast() {
    const last = innings.recentBalls[0];
    if (!last) return;
    if (!confirm("Undo last ball?")) return;
    setBusy(true);
    const res = await fetch(
      `/api/matches/${match.id}/innings/${innings.id}/balls/${last.id}`,
      { method: "DELETE" }
    );
    setBusy(false);
    if (!res.ok) {
      alert("Could not undo.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Link href={`/matches/${match.id}`} className="text-sm text-brand-700 hover:underline">
        ← Back to match
      </Link>

      {overEndedBanner && (
        <div
          role="status"
          className="card flex items-start gap-3 border-amber-300 bg-amber-50 p-4"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-900">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 8v5m0 3v.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-display text-sm font-bold text-amber-900">
              End of over {overEndedBanner.overNumber}
            </p>
            <p className="mt-0.5 text-sm text-amber-800">
              Batters have crossed — strike is now rotated. Please pick the next
              bowler (same bowler can&apos;t bowl two overs in a row).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOverEndedBanner(null)}
            className="rounded-md px-2 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100"
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Scoreboard */}
      <header className="card overflow-hidden p-0">
        <div className="bg-gradient-to-br from-brand-700 to-brand-900 p-6 text-white">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-wider text-white/70">
              Innings {innings.number} • {battingTeam.name} batting
            </p>
            <SuperOverToggle
              enabled={innings.isSuperOver}
              canToggle={canToggleSuperOver}
              busy={busy}
              onToggle={toggleSuperOver}
            />
          </div>
          <p className="mt-2 font-display text-4xl font-extrabold">
            {innings.totalRuns}/{innings.totalWickets}
            <span className="ml-3 text-2xl font-bold text-white/80">{overStr} ov</span>
          </p>
          <p className="mt-1 text-sm text-white/80">vs {bowlingTeam.name}</p>
        </div>

        {/* Recent balls */}
        <div className="flex flex-wrap items-center gap-1.5 p-4">
          <span className="text-xs font-semibold text-ink-500">Recent:</span>
          {innings.recentBalls.length === 0 && (
            <span className="text-xs text-ink-400">No balls yet.</span>
          )}
          {innings.recentBalls.slice().reverse().map((b) => (
            <span
              key={b.id}
              className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-bold ${
                b.isWicket
                  ? "bg-ink-900 text-white"
                  : b.runs === 6
                  ? "bg-emerald-500 text-white"
                  : b.runs === 4
                  ? "bg-amber-400 text-ink-900"
                  : b.extraType
                  ? "bg-sky-100 text-sky-800"
                  : "bg-ink-100 text-ink-700"
              }`}
            >
              {b.isWicket ? "W" : b.extraType ? b.extraType[0] : b.runs}
            </span>
          ))}
        </div>
      </header>

      {/* Selectors */}
      <section className="card p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Select
            label="Striker"
            value={strikerId}
            onChange={setStrikerId}
            options={battingTeam.players}
          />
          <Select
            label="Non-striker"
            value={nonStrikerId}
            onChange={setNonStrikerId}
            options={battingTeam.players}
          />
          <BowlerSelect
            value={bowlerId}
            onChange={setBowlerId}
            options={bowlingTeam.players}
            atOverBoundary={atOverBoundary}
            blockedBowlerId={innings.previousOverBowlerId}
          />
        </div>
      </section>

      {/* Extras toggles */}
      <section className="card p-5">
        <p className="label">Extra (optional)</p>
        <div className="flex flex-wrap gap-2">
          {["WIDE", "NO_BALL", "BYE", "LEG_BYE"].map((e) => (
            <button
              key={e}
              type="button"
              disabled={wicketMode}
              onClick={() => setExtraType(extraType === e ? null : e)}
              className={`btn ${
                extraType === e
                  ? "bg-brand-700 text-white"
                  : "border border-ink-200 bg-white text-ink-700"
              }`}
            >
              {e.replace("_", " ")}
            </button>
          ))}
        </div>
      </section>

      {/* Wicket panel OR run buttons */}
      {wicketMode ? (
        <section className="card border-ink-900 bg-ink-900/[.03] p-5 ring-1 ring-ink-900/10">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-ink-900">
              Record wicket
            </h3>
            <button
              type="button"
              onClick={() => {
                setWicketMode(false);
                setNewBatterId("");
                setWicketRuns(0);
                setFielderId("");
              }}
              className="text-sm text-ink-600 hover:underline"
            >
              Cancel
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Wicket type</label>
              <select
                value={wicketType}
                onChange={(e) => setWicketType(e.target.value)}
                className="input"
              >
                {WICKET_TYPES.map((w) => (
                  <option key={w.value} value={w.value}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Batter out</label>
              <div className="flex gap-2">
                <BatterChoice
                  label={`Striker — ${battingTeam.players.find((p) => p.id === strikerId)?.name ?? "—"}`}
                  active={outBatterEnd === "STRIKER"}
                  onClick={() => setOutBatterEnd("STRIKER")}
                />
                <BatterChoice
                  label={`Non-striker — ${battingTeam.players.find((p) => p.id === nonStrikerId)?.name ?? "—"}`}
                  active={outBatterEnd === "NON_STRIKER"}
                  onClick={() => setOutBatterEnd("NON_STRIKER")}
                />
              </div>
            </div>

            {/* Fielder picker — only shown when the dismissal type credits one */}
            {fielderRequired && (
              <div>
                <label className="label">
                  {fielderLabel} <span className="text-brand-700">*</span>
                </label>
                <select
                  value={fielderId}
                  onChange={(e) => setFielderId(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">Select fielder…</option>
                  {bowlingTeam.players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.id === bowlerId ? " (bowler)" : ""}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-ink-500">
                  Fielding credit will be added to this player&apos;s stats.
                </p>
              </div>
            )}

            <div>
              {availableNewBatters.length === 0 ? (
                <>
                  <label className="label">Last wicket</label>
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                    <b>All out incoming.</b> No batters left in the squad —
                    confirming this wicket will close the innings.
                  </div>
                </>
              ) : (
                <>
                  <label className="label">
                    New incoming batter{" "}
                    <span className="text-brand-700">*</span>
                  </label>
                  <select
                    value={newBatterId}
                    onChange={(e) => setNewBatterId(e.target.value)}
                    className="input"
                    required
                  >
                    <option value="">Select new batter…</option>
                    {availableNewBatters.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>

            <div>
              <label className="label">Runs scored on this ball</label>
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setWicketRuns(n)}
                    className={`h-11 flex-1 rounded-lg text-sm font-bold transition ${
                      wicketRuns === n
                        ? "bg-ink-900 text-white"
                        : "bg-ink-100 text-ink-700 hover:bg-ink-200"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={confirmWicket}
            disabled={
              busy ||
              (availableNewBatters.length > 0 && !newBatterId) ||
              (fielderRequired && !fielderId)
            }
            className="btn-primary mt-5 h-12 w-full"
          >
            {busy
              ? "Recording..."
              : availableNewBatters.length === 0
              ? "Confirm wicket & end innings"
              : "Confirm wicket"}
          </button>
          <p className="mt-2 text-center text-xs text-ink-500">
            {availableNewBatters.length === 0
              ? "This is the final wicket — the innings will close automatically."
              : "Selecting the new batter is required — bowler stays the same."}
          </p>
        </section>
      ) : (
        <section className="card p-5">
          <p className="label">Runs off this ball</p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {[0, 1, 2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                type="button"
                disabled={busy}
                onClick={() => recordRuns(n)}
                className={`h-14 rounded-xl text-lg font-bold transition ${
                  n === 4
                    ? "bg-amber-300 text-ink-900 hover:bg-amber-400"
                    : n === 6
                    ? "bg-emerald-500 text-white hover:bg-emerald-600"
                    : "bg-ink-100 text-ink-900 hover:bg-ink-200"
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setWicketMode(true)}
              className="btn bg-ink-900 text-white hover:bg-ink-800 h-12"
            >
              Wicket
            </button>
            <button
              type="button"
              disabled={busy || innings.recentBalls.length === 0}
              onClick={undoLast}
              className="btn-outline h-12"
            >
              Undo last ball
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; name: string }[];
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input"
      >
        <option value="">Select…</option>
        {options.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function BowlerSelect({
  value,
  onChange,
  options,
  atOverBoundary,
  blockedBowlerId
}: {
  value: string;
  onChange: (v: string) => void;
  options: { id: string; name: string }[];
  atOverBoundary: boolean;
  blockedBowlerId: string | null;
}) {
  return (
    <div>
      <label className="label">Bowler</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input"
      >
        <option value="">Select…</option>
        {options.map((p) => {
          const blocked = atOverBoundary && p.id === blockedBowlerId;
          return (
            <option key={p.id} value={p.id} disabled={blocked}>
              {p.name}
              {blocked ? "  —  bowled previous over" : ""}
            </option>
          );
        })}
      </select>
      {atOverBoundary && blockedBowlerId && (
        <p className="mt-1.5 text-xs text-ink-500">
          The bowler who finished the previous over can&apos;t bowl the next one.
        </p>
      )}
    </div>
  );
}

function BatterChoice({
  label,
  active,
  onClick
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg border px-3 py-2 text-left text-sm transition ${
        active
          ? "border-brand-700 bg-brand-50 text-brand-900"
          : "border-ink-200 bg-white text-ink-700 hover:border-brand-200"
      }`}
    >
      {label}
    </button>
  );
}

function SuperOverToggle({
  enabled,
  canToggle,
  busy,
  onToggle
}: {
  enabled: boolean;
  canToggle: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  if (enabled) {
    return (
      <button
        type="button"
        onClick={onToggle}
        disabled={!canToggle || busy}
        title={
          canToggle
            ? "Click to turn off Super Over"
            : "Super Over can only be changed at the start of an over"
        }
        className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-amber-950 transition hover:bg-amber-200 disabled:opacity-70"
      >
        <span>Super Over · 2× score</span>
        {canToggle && <span aria-hidden>×</span>}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!canToggle || busy}
      title={
        canToggle
          ? "Enable Super Over for this over onwards"
          : "Super Over can only be enabled at the start of an over"
      }
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider transition ${
        canToggle
          ? "bg-white/15 text-white hover:bg-white/25"
          : "bg-white/5 text-white/40 cursor-not-allowed"
      }`}
    >
      <span aria-hidden>+</span> Super Over
      {!canToggle && <span className="font-medium normal-case tracking-normal">(between overs only)</span>}
    </button>
  );
}
