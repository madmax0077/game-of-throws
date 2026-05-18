import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/roles";
import { formatDate } from "@/lib/utils";
import { AdminApprovalActions } from "@/components/admin/AdminApprovalActions";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireAdmin();

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
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-brand-700/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-brand-700">
            Admin
          </span>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            Tournament approvals
          </h1>
        </div>
        <p className="text-ink-600">
          Organizer-submitted tournaments stay hidden from the public until
          you approve them here. You can also see recently approved or
          rejected entries for context.
        </p>
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
                <AdminApprovalActions
                  tournamentId={t.id}
                  currentStatus="PENDING"
                />
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
    </div>
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
