import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPlayer } from "@/lib/roles";
import { TeamNameEditor } from "@/components/TeamNameEditor";
import { SquadEditor } from "@/components/SquadEditor";
import { PendingJoinRequests } from "@/components/PendingJoinRequests";
import { PickExistingPlayer } from "@/components/PickExistingPlayer";
import { JoinTeamButton } from "@/components/JoinTeamButton";

export const dynamic = "force-dynamic";

export default async function TeamDetailPage({
  params
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  const player = isPlayer(session?.user?.role);

  const team = await prisma.team.findUnique({
    where: { id: params.id },
    include: {
      tournament: true,
      players: { orderBy: [{ name: "asc" }] }
    }
  });

  if (!team) notFound();

  // Data needed for organizer-side controls (skipped for player view).
  const [joinRequests, availablePlayers] = await Promise.all(
    player
      ? [Promise.resolve([] as never[]), Promise.resolve([] as never[])]
      : [
          prisma.joinRequest.findMany({
            where: { teamId: team.id },
            include: { player: true },
            orderBy: { createdAt: "desc" }
          }),
          // Available pool: real player profiles (linked to a user) that
          // aren't yet attached to ANY team. This is what organizers
          // can directly pick from.
          prisma.player.findMany({
            where: {
              userId: { not: null },
              teamId: null
            },
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
              role: true,
              battingHand: true,
              bowlingArm: true,
              avatarUrl: true
            }
          })
        ]
  );

  const playersForEditor = team.players.map((p) => ({
    id: p.id,
    name: p.name,
    role: p.role,
    battingHand: p.battingHand
  }));

  // For player viewer: figure out their join state for THIS team.
  let myJoinState:
    | { kind: "ALREADY_IN_TEAM"; teamName: string }
    | { kind: "REQUESTED"; status: "PENDING" | "APPROVED" | "REJECTED" }
    | { kind: "CAN_REQUEST" }
    | { kind: "PROFILE_MISSING" }
    | null = null;
  if (player && session) {
    const me = await prisma.player.findFirst({
      where: { userId: session.user.id },
      select: { id: true, teamId: true, team: { select: { name: true } } }
    });
    if (!me) {
      myJoinState = { kind: "PROFILE_MISSING" };
    } else if (me.teamId === team.id) {
      myJoinState = { kind: "ALREADY_IN_TEAM", teamName: team.name };
    } else if (me.teamId) {
      myJoinState = {
        kind: "ALREADY_IN_TEAM",
        teamName: me.team?.name ?? "another team"
      };
    } else {
      const req = await prisma.joinRequest.findUnique({
        where: { teamId_playerId: { teamId: team.id, playerId: me.id } }
      });
      if (req) {
        myJoinState = {
          kind: "REQUESTED",
          status: req.status as "PENDING" | "APPROVED" | "REJECTED"
        };
      } else {
        myJoinState = { kind: "CAN_REQUEST" };
      }
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href={player ? "/tournaments" : "/teams"}
        className="text-sm text-brand-700 hover:underline"
      >
        ← {player ? "All tournaments" : "All teams"}
      </Link>

      <header className="card overflow-hidden p-0">
        <div className="bg-gradient-to-br from-ink-900 to-ink-950 p-8 text-white">
          {player ? (
            <>
              <h1 className="font-display text-3xl font-extrabold">
                {team.name}
              </h1>
              <p className="mt-1 text-sm text-white/70">
                {team.shortName}
                {team.homeCity ? ` • ${team.homeCity}` : ""}
              </p>
            </>
          ) : (
            <TeamNameEditor
              teamId={team.id}
              name={team.name}
              shortName={team.shortName}
              homeCity={team.homeCity}
            />
          )}
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

      {/* Player: join button / request status */}
      {player && myJoinState && (
        <section className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold">Join this team</h2>
              <p className="text-sm text-ink-500">
                {myJoinState.kind === "ALREADY_IN_TEAM" &&
                myJoinState.teamName === team.name
                  ? "You're already in this team."
                  : myJoinState.kind === "ALREADY_IN_TEAM"
                  ? `You're already playing for ${myJoinState.teamName}.`
                  : myJoinState.kind === "PROFILE_MISSING"
                  ? "Set up your profile first so the organizer knows your role."
                  : myJoinState.kind === "REQUESTED"
                  ? `Your request is ${myJoinState.status.toLowerCase()}.`
                  : "Request to join — the organizer will approve or reject."}
              </p>
            </div>
            <JoinTeamButton teamId={team.id} state={myJoinState} />
          </div>
        </section>
      )}

      {/* Squad */}
      {player ? (
        <section className="card p-6">
          <h2 className="font-display text-lg font-bold">
            Squad ({team.players.length})
          </h2>
          {team.players.length === 0 ? (
            <p className="mt-2 text-sm text-ink-500">
              No players in the squad yet.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-ink-100 rounded-xl border border-ink-100">
              {team.players.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-4 p-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">
                    {p.name[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold">{p.name}</p>
                    <p className="text-xs text-ink-500">
                      {prettyRole(p.role)} •{" "}
                      {p.battingHand === "LEFT" ? "LH" : "RH"} bat
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <>
          <section className="card p-6">
            <SquadEditor teamId={team.id} players={playersForEditor} />
          </section>

          <section className="card p-6">
            <h2 className="font-display text-lg font-bold">
              Add from registered players
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              Players who signed up on Game of Throws and haven&apos;t joined
              a team yet show up here. Pick them in one click.
            </p>
            <div className="mt-4">
              <PickExistingPlayer
                teamId={team.id}
                players={availablePlayers}
              />
            </div>
          </section>

          <PendingJoinRequests
            requests={joinRequests.map((r) => ({
              id: r.id,
              status: r.status as "PENDING" | "APPROVED" | "REJECTED",
              message: r.message,
              createdAt: r.createdAt.toISOString(),
              player: {
                id: r.player.id,
                name: r.player.name,
                role: r.player.role,
                battingHand: r.player.battingHand,
                bowlingArm: r.player.bowlingArm,
                avatarUrl: r.player.avatarUrl
              }
            }))}
          />
        </>
      )}
    </div>
  );
}

function prettyRole(r: string) {
  if (r === "ALL_ROUNDER") return "All-rounder";
  if (r === "WICKETKEEPER") return "Wicket-keeper";
  return r.charAt(0) + r.slice(1).toLowerCase();
}
