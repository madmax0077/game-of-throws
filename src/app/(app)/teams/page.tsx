import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    include: {
      tournament: true,
      _count: { select: { players: true } }
    }
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Teams</h1>
        <p className="mt-1 text-ink-600">All teams across your tournaments.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((t) => (
          <Link
            key={t.id}
            href={`/teams/${t.id}`}
            className="card p-5 transition hover:-translate-y-0.5 hover:shadow-glow"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-700 font-bold text-white">
                {t.shortName}
              </div>
              <div>
                <p className="font-display font-bold">{t.name}</p>
                <p className="text-xs text-ink-500">
                  {t.homeCity ?? "—"} • {t._count.players} players
                </p>
              </div>
            </div>
            {t.tournament && (
              <p className="mt-4 text-xs text-ink-500">
                In: <span className="font-medium text-ink-700">{t.tournament.name}</span>
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
