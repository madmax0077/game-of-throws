import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TeamNameEditor } from "@/components/TeamNameEditor";
import { SquadEditor } from "@/components/SquadEditor";

export const dynamic = "force-dynamic";

export default async function TeamDetailPage({
  params
}: {
  params: { id: string };
}) {
  const team = await prisma.team.findUnique({
    where: { id: params.id },
    include: {
      tournament: true,
      players: { orderBy: [{ jerseyNo: "asc" }, { createdAt: "asc" }] }
    }
  });

  if (!team) notFound();

  const players = team.players.map((p) => ({
    id: p.id,
    name: p.name,
    role: p.role,
    battingHand: p.battingHand,
    jerseyNo: p.jerseyNo
  }));

  return (
    <div className="space-y-6">
      <Link href="/teams" className="text-sm text-brand-700 hover:underline">
        ← All teams
      </Link>

      <header className="card overflow-hidden p-0">
        <div className="bg-gradient-to-br from-ink-900 to-ink-950 p-8 text-white">
          <TeamNameEditor
            teamId={team.id}
            name={team.name}
            shortName={team.shortName}
            homeCity={team.homeCity}
          />
          {team.tournament && (
            <p className="mt-4 text-sm text-white/60">
              In{" "}
              <Link
                href={`/tournaments/${team.tournament.id}`}
                className="font-semibold text-white hover:underline"
              >
                {team.tournament.name}
              </Link>
            </p>
          )}
        </div>
      </header>

      <section className="card p-6">
        <SquadEditor teamId={team.id} players={players} />
      </section>
    </div>
  );
}
