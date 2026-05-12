import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PlayerProfile({
  params
}: {
  params: { id: string };
}) {
  const player = await prisma.player.findUnique({
    where: { id: params.id },
    include: {
      team: true,
      ballsAsStriker: true,
      ballsAsBowler: true,
      ballsAsOutBatter: true
    }
  });
  if (!player) notFound();

  // Naive batting stats
  const battingBalls = player.ballsAsStriker;
  const runs = battingBalls.reduce((s, b) => s + b.runs, 0);
  const ballsFaced = battingBalls.filter((b) => b.legal).length;
  const fours = battingBalls.filter((b) => b.runs === 4).length;
  const sixes = battingBalls.filter((b) => b.runs === 6).length;
  const dismissals = player.ballsAsOutBatter.length;
  const battingAvg = dismissals === 0 ? runs : (runs / dismissals).toFixed(1);
  const strikeRate = ballsFaced === 0 ? "—" : ((runs / ballsFaced) * 100).toFixed(1);

  // Naive bowling stats
  const bowlBalls = player.ballsAsBowler;
  const wickets = bowlBalls.filter((b) => b.isWicket && b.wicketType !== "RUN_OUT").length;
  const runsConceded = bowlBalls.reduce((s, b) => s + b.runs + (b.extraRuns ?? 0), 0);
  const legalBowled = bowlBalls.filter((b) => b.legal).length;
  const economy = legalBowled === 0 ? "—" : ((runsConceded / (legalBowled / 6)).toFixed(2));

  return (
    <div className="space-y-6">
      <Link href="/players" className="text-sm text-brand-700 hover:underline">
        ← All players
      </Link>

      <header className="card overflow-hidden p-0">
        <div className="bg-gradient-to-br from-brand-700 to-brand-900 p-8 text-white">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-2xl font-bold">
              {player.name.slice(0, 1)}
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold">{player.name}</h1>
              <p className="mt-1 text-white/80">
                {player.role.replace("_", "-")} • {player.battingHand === "LEFT" ? "LH" : "RH"}{" "}
                bat
                {player.bowlingType && <> • {player.bowlingType.replace("_", " ").toLowerCase()}</>}
              </p>
              {player.team && (
                <Link
                  href={`/teams/${player.team.id}`}
                  className="mt-2 inline-block text-sm text-white/90 underline-offset-2 hover:underline"
                >
                  Plays for {player.team.name}
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-display text-lg font-bold">Batting</h2>
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <Stat label="Runs" value={runs} />
            <Stat label="Avg" value={battingAvg} />
            <Stat label="SR" value={strikeRate} />
            <Stat label="Balls" value={ballsFaced} />
            <Stat label="4s" value={fours} />
            <Stat label="6s" value={sixes} />
          </div>
        </div>
        <div className="card p-6">
          <h2 className="font-display text-lg font-bold">Bowling</h2>
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <Stat label="Wickets" value={wickets} />
            <Stat label="Runs" value={runsConceded} />
            <Stat label="Econ" value={economy} />
            <Stat label="Balls" value={legalBowled} />
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-ink-50 p-3">
      <p className="text-xs text-ink-500">{label}</p>
      <p className="mt-1 font-display text-xl font-bold">{value}</p>
    </div>
  );
}
