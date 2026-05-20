import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";
import { formatDate } from "@/lib/utils";
import {
  ensureAdminUser,
  getConfiguredAdminEmail
} from "@/lib/adminBootstrap";
import { AdminApprovalActions } from "@/components/admin/AdminApprovalActions";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { AdminDeleteButton } from "@/components/admin/AdminDeleteButton";
import { DeleteTournamentButton } from "@/components/admin/DeleteTournamentButton";

export const dynamic = "force-dynamic";

/**
 * /admin
 *
 *   - signed out          → render the admin sign-in form
 *   - signed in (not admin) → show a "not authorised" notice with sign-out
 *   - signed in as admin  → render the approvals dashboard
 *
 * The admin user is auto-created (and demoted alongside any other rogue
 * ADMINs) on every render via `ensureAdminUser()`, so the env-var-driven
 * admin credential is always the single source of truth.
 */
export default async function AdminPage() {
  // Make sure exactly one admin exists with the configured credentials.
  await ensureAdminUser().catch((err) => {
    console.error("[admin] ensureAdminUser failed:", err);
  });

  const session = await getServerSession(authOptions);
  const configuredEmail = getConfiguredAdminEmail();

  if (!session) {
    return <AdminLoginForm defaultEmail={configuredEmail} />;
  }

  if (!isAdmin(session.user.role)) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6 text-center">
        <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-rose-800">
          Not authorised
        </span>
        <h1 className="font-display text-2xl font-extrabold">
          This area is for the admin only
        </h1>
        <p className="text-sm text-ink-600">
          You&apos;re signed in as{" "}
          <span className="font-semibold">{session.user.email}</span>. Sign
          out and use the admin account to continue.
        </p>
        <AdminSignOutButton />
        <p className="text-xs text-ink-500">
          Organizer? Head to{" "}
          <Link href="/dashboard" className="font-semibold underline">
            your dashboard
          </Link>{" "}
          instead.
        </p>
      </div>
    );
  }

  // ─────────────── Admin is signed in: render the dashboard ───────────────
  const [pending, approved, rejected, totals] = await Promise.all([
    prisma.tournament.findMany({
      where: { approvalStatus: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: {
        organizer: { select: { id: true, name: true, email: true } },
        _count: { select: { teams: true, matches: true } }
      }
    }),
    prisma.tournament.findMany({
      where: { approvalStatus: "APPROVED" },
      orderBy: { approvedAt: "desc" },
      take: 8,
      include: {
        organizer: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } }
      }
    }),
    prisma.tournament.findMany({
      where: { approvalStatus: "REJECTED" },
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: { organizer: { select: { id: true, name: true } } }
    }),
    prisma.tournament.groupBy({
      by: ["approvalStatus"],
      _count: { _all: true }
    })
  ]);

  const totalsByStatus: Record<string, number> = {};
  for (const row of totals) {
    totalsByStatus[row.approvalStatus] = row._count._all;
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-brand-700/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-brand-700">
              Admin
            </span>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">
              Admin dashboard
            </h1>
          </div>
          <p className="mt-1 text-ink-600">
            Approve tournaments, and permanently delete tournaments, matches, or
            players when needed.
          </p>
          <p className="mt-1 text-xs text-ink-500">
            Signed in as{" "}
            <span className="font-semibold">{session.user.email}</span>
          </p>
        </div>
        <AdminSignOutButton />
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Pending review"
          value={totalsByStatus["PENDING"] ?? 0}
          tone="amber"
        />
        <StatCard
          label="Approved"
          value={totalsByStatus["APPROVED"] ?? 0}
          tone="emerald"
        />
        <StatCard
          label="Rejected"
          value={totalsByStatus["REJECTED"] ?? 0}
          tone="rose"
        />
      </div>

      <section className="card overflow-hidden p-0">
        <header className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-bold">Pending review</h2>
            <p className="mt-0.5 text-xs text-ink-500">
              These tournaments are only visible to their organizer and to
              you until you approve them.
            </p>
          </div>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
            {pending.length} pending
          </span>
        </header>

        {pending.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-ink-500">
            All caught up — nothing waiting for approval right now.
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {pending.map((t) => (
              <li
                key={t.id}
                className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/tournaments/${t.id}`}
                      className="truncate font-display text-base font-bold text-ink-900 hover:text-brand-700"
                    >
                      {t.name}
                    </Link>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                      Pending
                    </span>
                    <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-700">
                      {t.format} · {t.overs} overs
                    </span>
                  </div>
                  <p className="text-xs text-ink-500">
                    {t.city} · {formatDate(t.startDate)} →{" "}
                    {formatDate(t.endDate)}
                  </p>
                  <p className="text-xs text-ink-600">
                    Submitted by{" "}
                    <span className="font-semibold text-ink-800">
                      {t.organizer.name}
                    </span>{" "}
                    <span className="text-ink-400">({t.organizer.email})</span>{" "}
                    on {formatDate(t.createdAt)}
                  </p>
                  <p className="text-xs text-ink-500">
                    {t._count.teams} {t._count.teams === 1 ? "team" : "teams"} ·{" "}
                    {t._count.matches}{" "}
                    {t._count.matches === 1 ? "match" : "matches"} so far
                  </p>
                </div>
                <div className="flex flex-col items-stretch gap-2 sm:items-end">
                  <AdminApprovalActions
                    tournamentId={t.id}
                    currentStatus="PENDING"
                  />
                  <DeleteTournamentButton
                    tournamentId={t.id}
                    tournamentName={t.name}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <RecentSection
          title="Recently approved"
          emptyText="No approved tournaments yet."
          rows={approved.map((t) => ({
            id: t.id,
            name: t.name,
            organizer: t.organizer.name,
            secondary: t.approvedBy?.name
              ? `Approved by ${t.approvedBy.name}`
              : "Approved",
            when: t.approvedAt ?? t.updatedAt,
            tone: "emerald" as const
          }))}
        />
        <RecentSection
          title="Recently rejected"
          emptyText="Nothing rejected yet."
          rows={rejected.map((t) => ({
            id: t.id,
            name: t.name,
            organizer: t.organizer.name,
            secondary: t.rejectionReason || "Rejected",
            when: t.updatedAt,
            tone: "rose" as const
          }))}
        />
      </div>

      <AllTournamentsSection />
      <AllMatchesSection />
      <AllPlayersSection />
    </div>
  );
}

function playerHasScoringData(counts: {
  ballsAsStriker: number;
  ballsAsNonStriker: number;
  ballsAsBowler: number;
  ballsAsOutBatter: number;
  ballsAsFielder: number;
}): boolean {
  return (
    counts.ballsAsStriker +
      counts.ballsAsNonStriker +
      counts.ballsAsBowler +
      counts.ballsAsOutBatter +
      counts.ballsAsFielder >
    0
  );
}

async function AllMatchesSection() {
  const matches = await prisma.match.findMany({
    orderBy: { scheduledAt: "desc" },
    take: 100,
    include: {
      tournament: { select: { id: true, name: true } },
      homeTeam: { select: { shortName: true, name: true } },
      awayTeam: { select: { shortName: true, name: true } }
    }
  });

  return (
    <section className="card overflow-hidden p-0">
      <header className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
        <div>
          <h2 className="font-display text-lg font-bold">All matches</h2>
          <p className="mt-0.5 text-xs text-ink-500">
            Deletes the match and all innings / ball-by-ball data. Teams are
            not removed.
          </p>
        </div>
        <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-bold text-ink-700">
          {matches.length} shown
        </span>
      </header>
      {matches.length === 0 ? (
        <p className="px-5 py-6 text-center text-sm text-ink-500">
          No matches yet.
        </p>
      ) : (
        <ul className="divide-y divide-ink-100">
          {matches.map((m) => (
            <li
              key={m.id}
              className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/matches/${m.id}`}
                    className="truncate text-sm font-semibold text-ink-900 hover:text-brand-700"
                  >
                    {m.homeTeam.shortName} vs {m.awayTeam.shortName}
                  </Link>
                  <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-700">
                    {m.status}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-ink-500">
                  <Link
                    href={`/tournaments/${m.tournament.id}`}
                    className="hover:text-brand-700"
                  >
                    {m.tournament.name}
                  </Link>
                  {" · "}
                  {m.venue} · {formatDate(m.scheduledAt)} · {m.overs} overs
                </p>
              </div>
              <AdminDeleteButton
                deleteUrl={`/api/admin/matches/${m.id}`}
                itemName={`${m.homeTeam.shortName} vs ${m.awayTeam.shortName}`}
                size="sm"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

async function AllPlayersSection() {
  const players = await prisma.player.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      team: { select: { shortName: true, name: true } },
      _count: {
        select: {
          ballsAsStriker: true,
          ballsAsNonStriker: true,
          ballsAsBowler: true,
          ballsAsOutBatter: true,
          ballsAsFielder: true
        }
      }
    }
  });

  return (
    <section className="card overflow-hidden p-0">
      <header className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
        <div>
          <h2 className="font-display text-lg font-bold">All players</h2>
          <p className="mt-0.5 text-xs text-ink-500">
            Only players with no scoring history can be deleted. Others must be
            renamed from the team page.
          </p>
        </div>
        <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-bold text-ink-700">
          {players.length} shown
        </span>
      </header>
      {players.length === 0 ? (
        <p className="px-5 py-6 text-center text-sm text-ink-500">
          No players yet.
        </p>
      ) : (
        <ul className="divide-y divide-ink-100">
          {players.map((p) => {
            const hasScoring = playerHasScoringData(p._count);
            return (
              <li
                key={p.id}
                className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/players/${p.id}`}
                      className="truncate text-sm font-semibold text-ink-900 hover:text-brand-700"
                    >
                      {p.name}
                    </Link>
                    <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-700">
                      {p.role}
                    </span>
                    {p.isCaptain && (
                      <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-800">
                        Captain
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-ink-500">
                    {p.team
                      ? `${p.team.name} (${p.team.shortName})`
                      : "No team"}
                    {p.jerseyNo != null ? ` · #${p.jerseyNo}` : ""}
                  </p>
                </div>
                <AdminDeleteButton
                  deleteUrl={`/api/admin/players/${p.id}`}
                  itemName={p.name}
                  size="sm"
                  disabled={hasScoring}
                  disabledReason={
                    hasScoring
                      ? "Has ball-by-ball records"
                      : undefined
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

async function AllTournamentsSection() {
  // Full list so the admin can clean up anything — including tournaments
  // that were approved long ago.
  const all = await prisma.tournament.findMany({
    orderBy: [{ approvalStatus: "asc" }, { createdAt: "desc" }],
    include: {
      organizer: { select: { id: true, name: true, email: true } },
      _count: { select: { teams: true, matches: true } }
    }
  });

  if (all.length === 0) {
    return (
      <section className="card overflow-hidden p-0">
        <header className="border-b border-ink-100 px-5 py-3">
          <h2 className="font-display text-lg font-bold">All tournaments</h2>
        </header>
        <p className="px-5 py-6 text-center text-sm text-ink-500">
          No tournaments exist yet.
        </p>
      </section>
    );
  }

  return (
    <section className="card overflow-hidden p-0">
      <header className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
        <div>
          <h2 className="font-display text-lg font-bold">All tournaments</h2>
          <p className="mt-0.5 text-xs text-ink-500">
            Permanently delete a tournament here. Matches are removed with
            it; teams are kept and just unlinked.
          </p>
        </div>
        <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-bold text-ink-700">
          {all.length} total
        </span>
      </header>
      <ul className="divide-y divide-ink-100">
        {all.map((t) => (
          <li
            key={t.id}
            className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/tournaments/${t.id}`}
                  className="truncate text-sm font-semibold text-ink-900 hover:text-brand-700"
                >
                  {t.name}
                </Link>
                <ApprovalBadge status={t.approvalStatus} />
              </div>
              <p className="mt-0.5 truncate text-xs text-ink-500">
                {t.city} · by {t.organizer.name} · {t._count.teams}{" "}
                {t._count.teams === 1 ? "team" : "teams"} · {t._count.matches}{" "}
                {t._count.matches === 1 ? "match" : "matches"}
              </p>
            </div>
            <DeleteTournamentButton
              tournamentId={t.id}
              tournamentName={t.name}
              size="sm"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ApprovalBadge({ status }: { status: string }) {
  if (status === "APPROVED") {
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
        Approved
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-800">
        Rejected
      </span>
    );
  }
  return (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
      Pending
    </span>
  );
}

function StatCard({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: "amber" | "emerald" | "rose";
}) {
  const palette = {
    amber: "from-amber-50 to-white text-amber-900 ring-amber-200",
    emerald: "from-emerald-50 to-white text-emerald-900 ring-emerald-200",
    rose: "from-rose-50 to-white text-rose-900 ring-rose-200"
  }[tone];
  return (
    <div
      className={`rounded-2xl bg-gradient-to-br p-5 shadow-sm ring-1 ${palette}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
        {label}
      </p>
      <p className="mt-1 font-display text-3xl font-bold">{value}</p>
    </div>
  );
}

function RecentSection({
  title,
  emptyText,
  rows
}: {
  title: string;
  emptyText: string;
  rows: Array<{
    id: string;
    name: string;
    organizer: string;
    secondary: string;
    when: Date;
    tone: "emerald" | "rose";
  }>;
}) {
  return (
    <section className="card overflow-hidden p-0">
      <header className="border-b border-ink-100 px-5 py-3">
        <h2 className="font-display text-base font-bold">{title}</h2>
      </header>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-center text-sm text-ink-500">
          {emptyText}
        </p>
      ) : (
        <ul className="divide-y divide-ink-100">
          {rows.map((r) => (
            <li key={r.id} className="px-5 py-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/tournaments/${r.id}`}
                    className="block truncate font-semibold text-ink-900 hover:text-brand-700"
                  >
                    {r.name}
                  </Link>
                  <p className="truncate text-xs text-ink-500">
                    by {r.organizer} · {r.secondary}
                  </p>
                </div>
                <span
                  className={
                    r.tone === "emerald"
                      ? "shrink-0 text-xs text-emerald-700"
                      : "shrink-0 text-xs text-rose-700"
                  }
                >
                  {formatDate(r.when)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
