import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PlayerStats = {
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  wickets: number;
  ballsBowled: number;
  runsConceded: number;
};

function emptyStats(): PlayerStats {
  return {
    runs: 0,
    ballsFaced: 0,
    fours: 0,
    sixes: 0,
    wickets: 0,
    ballsBowled: 0,
    runsConceded: 0
  };
}

export default async function PlayersPage() {
  const [players, balls] = await Promise.all([
    prisma.player.findMany({
      include: { team: true },
      take: 500
    }),
    prisma.ball.findMany({
      select: {
        strikerId: true,
        bowlerId: true,
        runs: true,
        extraType: true,
        extraRuns: true,
        isWicket: true,
        wicketType: true,
        legal: true
      }
    })
  ]);

  // Aggregate batting + bowling stats per player from raw balls.
  const statsById = new Map<string, PlayerStats>();
  const ensure = (id: string) => {
    let s = statsById.get(id);
    if (!s) {
      s = emptyStats();
      statsById.set(id, s);
    }
    return s;
  };

  for (const b of balls) {
    // Batting (striker only — extras go to extras column conceptually)
    const bat = ensure(b.strikerId);
    // Off-the-bat runs only: byes/leg-byes shouldn't credit the batter.
    const offBat =
      b.extraType === "BYE" || b.extraType === "LEG_BYE" ? 0 : b.runs;
    bat.runs += offBat;
    if (b.legal) bat.ballsFaced += 1;
    if (offBat === 4) bat.fours += 1;
    if (offBat === 6) bat.sixes += 1;

    // Bowling
    const bowl = ensure(b.bowlerId);
    if (b.legal) bowl.ballsBowled += 1;
    // Bowler's economy includes runs off bat + wides/no-balls; not byes/leg-byes.
    const conceded =
      b.extraType === "BYE" || b.extraType === "LEG_BYE"
        ? 0
        : b.runs + (b.extraRuns ?? 0);
    bowl.runsConceded += conceded;
    if (b.isWicket && b.wicketType && b.wicketType !== "RUN_OUT") {
      bowl.wickets += 1;
    }
  }

  // Performance rating: runs + 25 × wickets, with small bonuses for boundaries.
  // It's intentionally simple so users can predict it, and rewards both
  // batters and bowlers comparably.
  function rate(s: PlayerStats) {
    return s.runs + s.wickets * 25 + s.fours * 1 + s.sixes * 2;
  }

  const ranked = players
    .map((p) => {
      const s = statsById.get(p.id) ?? emptyStats();
      return { player: p, stats: s, rating: rate(s) };
    })
    .sort(
      (a, b) =>
        b.rating - a.rating ||
        b.stats.runs - a.stats.runs ||
        b.stats.wickets - a.stats.wickets ||
        a.player.name.localeCompare(b.player.name)
    );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          Player rankings
        </h1>
        <p className="mt-1 text-ink-600">
          Ranked by performance:{" "}
          <span className="font-semibold">
            runs + 25 × wickets + boundary bonuses
          </span>
          .
        </p>
      </header>

      {ranked.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-500">
          No players yet. Add a team and squad to start ranking players.
        </div>
      ) : (
        <div className="space-y-3">
          {ranked.map((r, i) => (
            <PlayerRankCard
              key={r.player.id}
              rank={i + 1}
              name={r.player.name}
              jerseyNo={r.player.jerseyNo}
              role={r.player.role}
              teamName={r.player.team?.name ?? "Free agent"}
              runs={r.stats.runs}
              wickets={r.stats.wickets}
              rating={r.rating}
              href={`/players/${r.player.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PlayerRankCard({
  rank,
  name,
  jerseyNo,
  role,
  teamName,
  runs,
  wickets,
  rating,
  href
}: {
  rank: number;
  name: string;
  jerseyNo: number | null;
  role: string;
  teamName: string;
  runs: number;
  wickets: number;
  rating: number;
  href: string;
}) {
  const isPodium = rank <= 3;
  const podiumColor =
    rank === 1
      ? "bg-amber-300 text-amber-950"
      : rank === 2
      ? "bg-ink-200 text-ink-900"
      : rank === 3
      ? "bg-amber-700/30 text-amber-900"
      : "bg-ink-100 text-ink-700";

  return (
    <div className="card flex items-center gap-4 p-4">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-extrabold ${podiumColor}`}
      >
        {rank}
      </div>

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-bold">
        {jerseyNo ?? "—"}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{name}</p>
        <p className="text-xs text-ink-500">
          {teamName} • {role.replace("_", "-").toLowerCase()}
        </p>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
          <span className="text-ink-700">
            <b>{runs}</b> runs
          </span>
          <span className="text-ink-700">
            <b>{wickets}</b> wkts
          </span>
          <span className="font-semibold text-brand-700">
            Rating {rating}
          </span>
        </div>
      </div>

      <Link
        href={href}
        className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
          isPodium
            ? "bg-brand-700 text-white hover:bg-brand-800"
            : "border border-ink-200 text-ink-700 hover:border-brand-200 hover:text-brand-700"
        }`}
      >
        View →
      </Link>
    </div>
  );
}
