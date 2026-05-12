import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MyProfileEditor } from "./MyProfileEditor";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MyProfilePage({
  searchParams
}: {
  searchParams: { welcome?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  let player = await prisma.player.findFirst({
    where: { userId: session.user.id },
    include: {
      team: { include: { tournament: true } }
    }
  });
  // Auto-create a stub profile so the editor always has something to bind to.
  // (Covers legacy accounts that pre-date the player-profile split.)
  if (!player) {
    player = await prisma.player.create({
      data: {
        userId: session.user.id,
        name: session.user.name ?? "Player",
        role: "BATTER",
        battingHand: "RIGHT"
      },
      include: { team: { include: { tournament: true } } }
    });
  }

  const myRequests = await prisma.joinRequest.findMany({
    where: { playerId: player.id },
    include: { team: { include: { tournament: true } } },
    orderBy: { updatedAt: "desc" }
  });

  const showWelcome = searchParams.welcome === "1";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {showWelcome && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <b>Welcome to Game of Throws!</b> Tell us a bit about your game so
          organizers can find you for their teams.
        </div>
      )}

      <header>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          My profile
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          This is the profile organizers see when picking team members.
        </p>
      </header>

      {player.team && (
        <div className="card flex items-center justify-between p-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-500">
              Currently playing for
            </p>
            <p className="font-display text-lg font-bold">
              {player.team.name}
            </p>
            <p className="text-xs text-ink-500">
              {player.team.tournament?.name ?? "No tournament"}
            </p>
          </div>
          <Link
            href={`/teams/${player.team.id}`}
            className="btn-outline text-xs"
          >
            View team →
          </Link>
        </div>
      )}

      <MyProfileEditor
        initial={{
          name: player.name,
          avatarUrl: player.avatarUrl,
          role: player.role,
          battingHand: player.battingHand,
          bowlingArm: player.bowlingArm,
          bowlingType: player.bowlingType
        }}
      />

      {myRequests.length > 0 && (
        <section className="card p-6">
          <h2 className="font-display text-lg font-bold">My join requests</h2>
          <div className="mt-4 space-y-3">
            {myRequests.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-ink-100 p-3"
              >
                <div>
                  <p className="text-sm font-semibold">{r.team.name}</p>
                  <p className="text-xs text-ink-500">
                    {r.team.tournament?.name ?? "—"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    r.status === "APPROVED"
                      ? "bg-emerald-100 text-emerald-800"
                      : r.status === "REJECTED"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
